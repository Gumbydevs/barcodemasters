class PvPBattleManager {
    constructor(battleCode, creatorId) {
        this.battleCode = battleCode;
        this.creatorId = creatorId;
        this.db = firebase.firestore();
        if (battleCode && creatorId) {
            this.battleRef = this.db
                .collection('users')
                .doc(creatorId)
                .collection('battles')
                .doc(battleCode);
        }
    }

    // Update the createBattle static method
    static async createBattle(monsterId, battleCode) {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('Not authenticated');

        try {
            // Fetch monster data first
            const monsterDoc = await firebase.firestore()
                .collection('monsters')
                .doc(monsterId)
                .get();

            if (!monsterDoc.exists) {
                throw new Error('Monster not found');
            }

            const monsterData = monsterDoc.data();
            if (monsterData.ownerId !== user.uid) {
                throw new Error('Monster not owned by user');
            }

            const battleData = {
                battleCode,
                creator: {
                    uid: user.uid,
                    monster: monsterId,
                    monsterData: monsterData,
                    ready: true,
                    currentHP: monsterData.HP
                },
                opponent: null,
                status: 'waiting',
                currentTurn: null,
                lastUpdate: firebase.firestore.FieldValue.serverTimestamp(),
                created: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Create in user's battles subcollection
            await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .collection('battles')
                .doc(battleCode)
                .set(battleData);

            return battleData;
        } catch (error) {
            console.error('Error creating battle:', error);
            throw error;
        }
    }

    async makeMove(move, data) {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('User not authenticated');

        const battle = await this.battleRef.get();
        if (!battle.exists) throw new Error('Battle not found');

        const battleData = battle.data();
        if (battleData.currentTurn !== user.uid) throw new Error('Not your turn');

        // Process the move
        const updates = this.calculateMoveOutcome(move, data, battleData);
        
        // Update battle state
        await this.battleRef.update({
            ...updates,
            lastUpdate: firebase.firestore.FieldValue.serverTimestamp(),
            currentTurn: this.getNextTurn(battleData),
            moves: firebase.firestore.FieldValue.arrayUnion({
                player: user.uid,
                move,
                data,
                timestamp: new Date()
            })
        });
    }

    calculateMoveOutcome(move, data, battleState) {
        const updates = {};
        const user = firebase.auth().currentUser;
        const isCreator = user.uid === battleState.creator.uid;
        const attacker = isCreator ? battleState.creator : battleState.opponent;
        const defender = isCreator ? battleState.opponent : battleState.creator;

        switch (move) {
            case 'attack':
                const newHealth = Math.max(0, defender.currentHP - data.damage);
                updates[`${isCreator ? 'opponent' : 'creator'}.currentHP`] = newHealth;
                break;

            case 'defend':
                updates[`${isCreator ? 'creator' : 'opponent'}.isDefending`] = true;
                break;

            case 'heal':
                const maxHealth = attacker.monsterData.HP;
                const newHealedHealth = Math.min(maxHealth, attacker.currentHP + data.amount);
                updates[`${isCreator ? 'creator' : 'opponent'}.currentHP`] = newHealedHealth;
                break;

            case 'special':
                const newHealthAfterSpecial = Math.max(0, defender.currentHP - data.damage);
                updates[`${isCreator ? 'opponent' : 'creator'}.currentHP`] = newHealthAfterSpecial;
                updates[`${isCreator ? 'creator' : 'opponent'}.specialCooldown`] = 3;
                break;
        }

        // Check for battle end
        if (updates[`${isCreator ? 'opponent' : 'creator'}.currentHP`] === 0) {
            updates.status = 'completed';
            updates.winner = user.uid;
            this.handleBattleEnd(battleState, user.uid);
        }

        return updates;
    }

    async handleBattleEnd(battleState, winnerId) {
        const winner = winnerId === battleState.creator.uid ? 
            battleState.creator : battleState.opponent;
        const loser = winnerId === battleState.creator.uid ? 
            battleState.opponent : battleState.creator;

        // Calculate and award XP
        const levelDiff = loser.monsterData.level - winner.monsterData.level;
        const baseXP = 50;
        const xpGain = Math.max(baseXP + (levelDiff * 10), Math.floor(baseXP * 0.5));

        // Update winner's monster
        const winnerMonsterRef = db.collection('monsters').doc(winner.monster);
        await winnerMonsterRef.update({
            experience: firebase.firestore.FieldValue.increment(xpGain)
        });
    }

    getNextTurn(battleState) {
        // Switch turns between creator and opponent
        return battleState.currentTurn === battleState.creator.uid ?
            battleState.opponent.uid : battleState.creator.uid;
    }

    // Add new method to get battle reference
    getBattleRef() {
        return this.battleRef;
    }

    static async cleanupStuckBattles(userId) {
        const db = firebase.firestore();
        try {
            const userBattlesRef = db.collection('users').doc(userId).collection('battles');
            
            // Get all potentially stuck battles
            const stuckBattles = await userBattlesRef
                .where('status', 'in', ['waiting', 'in_progress', 'joining'])
                .get();

            const thirtyMinutesAgo = new Date();
            thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

            const cleanup = stuckBattles.docs.map(async (doc) => {
                const battle = doc.data();
                const lastUpdate = battle.lastUpdate?.toDate() || battle.created?.toDate();
                
                if (lastUpdate < thirtyMinutesAgo) {
                    // Delete old battles
                    await doc.ref.delete();
                } else {
                    // Cancel more recent ones
                    await doc.ref.update({
                        status: 'cancelled',
                        lastUpdate: firebase.firestore.FieldValue.serverTimestamp(),
                        cancellationReason: 'cleanup'
                    });
                }
            });

            await Promise.all(cleanup);

            // Also reset the user's battle state
            await db.collection('users').doc(userId).update({
                activeBattle: null,
                battleStatus: null
            });

            return true;
        } catch (error) {
            console.error('Error cleaning up battles:', error);
            throw error;
        }
    }

    // Add this method to handle force reset
    static async forceResetBattle(userId, battleCode) {
        const db = firebase.firestore();
        try {
            const battleRef = db.collection('users').doc(userId).collection('battles').doc(battleCode);
            await battleRef.update({
                status: 'cancelled',
                lastUpdate: firebase.firestore.FieldValue.serverTimestamp(),
                cancellationReason: 'force_reset'
            });
            
            await db.collection('users').doc(userId).update({
                activeBattle: null,
                battleStatus: null
            });

            return true;
        } catch (error) {
            console.error('Error force resetting battle:', error);
            throw error;
        }
    }

    static async resetUserBattleState(userId) {
        const db = firebase.firestore();
        try {
            const userRef = db.collection('users').doc(userId);
            await userRef.update({
                activeBattle: null,
                battleStatus: null
            });
            return true;
        } catch (error) {
            console.error('Error resetting battle state:', error);
            throw error;
        }
    }

    // Change from static to instance method
    async initializeBattlesCollection(userId) {
        if (!userId) {
            const user = firebase.auth().currentUser;
            if (!user) throw new Error('Not authenticated');
            userId = user.uid;
        }

        try {
            const userRef = this.db.collection('users').doc(userId);
            const battlesRef = userRef.collection('battles');
            
            // Check if collection exists
            const snapshot = await battlesRef.limit(1).get();
            
            if (snapshot.empty) {
                // Create initialization document
                await battlesRef.doc('__init__').set({
                    created: firebase.firestore.FieldValue.serverTimestamp(),
                    type: 'initialization'
                });
                
                // Clean up initialization document
                await battlesRef.doc('__init__').delete();
            }
            
            return true;
        } catch (error) {
            console.error('Error initializing battles collection:', error);
            throw error;
        }
    }
}

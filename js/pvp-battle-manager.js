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

        const db = firebase.firestore();
        
        try {
            // First reset any existing battle state
            await this.resetUserBattleState(user.uid);

            console.log('Starting battle creation for monster:', monsterId);
            
            // First check if user already has an active battle
            const existingBattles = await db
                .collection('users')
                .doc(user.uid)
                .collection('battles')
                .where('status', 'in', ['waiting', 'in_progress'])
                .get();

            if (!existingBattles.empty) {
                throw new Error('You already have an active battle');
            }

            // Fetch monster data
            const monsterDoc = await db.collection('monsters').doc(monsterId).get();
            if (!monsterDoc.exists) throw new Error('Monster not found');

            const monsterData = monsterDoc.data();
            if (monsterData.ownerId !== user.uid) throw new Error('Not your monster');

            console.log('Monster data fetched:', monsterData);

            // Create battle with proper initialization
            const battleData = {
                battleCode,
                creator: {
                    uid: user.uid,
                    monster: monsterId,
                    monsterData: monsterData,
                    currentHP: monsterData.HP,
                    ready: true
                },
                opponent: null,
                status: 'waiting',
                currentTurn: null,
                moves: [],
                created: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdate: firebase.firestore.FieldValue.serverTimestamp(),
                battleType: 'pvp'  // Add this to identify PvP battles
            };

            console.log('Creating battle with data:', battleData);

            // Create in user's battles subcollection
            const battleRef = db
                .collection('users')
                .doc(user.uid)
                .collection('battles')
                .doc(battleCode);

            await battleRef.set(battleData);

            // Also update user's active battle reference
            await db.collection('users').doc(user.uid).update({
                activeBattle: battleCode,
                battleStatus: 'waiting',
                activeBattleCreator: user.uid  // Add this to track the creator
            });

            console.log('Battle created successfully');

            // Return immediately without any redirects
            return { 
                battleCode, 
                creatorId: user.uid,
                status: 'waiting'
            };

        } catch (error) {
            console.error('Error in createBattle:', error);
            await this.resetUserBattleState(user.uid);
            throw error;
        }
    }

    // Change from instance method to static method
    static async joinBattle(battleCode, creatorId, joiningUserId, monsterData) {
        const db = firebase.firestore();
        const battleRef = db
            .collection('users')
            .doc(creatorId)
            .collection('battles')
            .doc(battleCode);

        try {
            if (!monsterData || !monsterData.id) {
                throw new Error('Invalid monster data');
            }

            // Simple update without transaction for more reliability
            const battleDoc = await battleRef.get();
            if (!battleDoc.exists) {
                throw new Error('Battle not found');
            }

            const battleData = battleDoc.data();
            if (battleData.status !== 'waiting') {
                throw new Error('Battle is no longer available');
            }

            if (battleData.creator.uid === joiningUserId) {
                throw new Error('Cannot join your own battle');
            }

            const batch = db.batch();

            // Update battle document
            const opponentData = {
                uid: joiningUserId,
                monster: monsterData.id,
                monsterData: monsterData,
                currentHP: monsterData.HP,
                ready: true
            };

            batch.update(battleRef, {
                opponent: opponentData,
                status: 'in_progress',
                currentTurn: battleData.creator.uid,
                lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update joining user's state
            batch.update(db.collection('users').doc(joiningUserId), {
                activeBattle: battleCode,
                battleStatus: 'in_progress',
                activeBattleCreator: creatorId
            });

            // Update creator's state
            batch.update(db.collection('users').doc(creatorId), {
                battleStatus: 'in_progress'
            });

            // Commit all updates atomically
            await batch.commit();

            return {
                status: 'in_progress',
                battleCode,
                creatorId
            };

        } catch (error) {
            console.error('Error joining battle:', error);
            throw error;
        }
    }

    async makeMove(move, data) {
        if (!this.battleRef) throw new Error('Battle reference not initialized');
        
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('User not authenticated');

        try {
            const battleDoc = await this.battleRef.get();
            if (!battleDoc.exists) throw new Error('Battle not found');
            
            const battleData = battleDoc.data();
            if (battleData.status !== 'in_progress') throw new Error('Battle is not in progress');
            if (battleData.currentTurn !== user.uid) throw new Error('Not your turn');

            // Calculate move outcome
            const updates = this.calculateMoveOutcome(move, data, battleData);

            // Add move to history
            const moveHistory = battleData.moves || [];
            moveHistory.push({
                userId: user.uid,
                move: move,
                data: data,
                timestamp: new Date()
            });

            // Update battle state
            const fullUpdates = {
                ...updates,
                moves: moveHistory,
                lastUpdate: firebase.firestore.FieldValue.serverTimestamp(),
                currentTurn: this.getNextTurn(battleData)
            };

            await this.battleRef.update(fullUpdates);
            return fullUpdates;
        } catch (error) {
            console.error('Error making move:', error);
            throw error;
        }
    }

    calculateMoveOutcome(move, data, battleState) {
        const user = firebase.auth().currentUser;
        const isCreator = user.uid === battleState.creator.uid;
        const attacker = isCreator ? battleState.creator : battleState.opponent;
        const defender = isCreator ? battleState.opponent : battleState.creator;
        const updates = {};

        // Add debugging
        console.log('Move calculation:', { move, data, isCreator, attacker, defender });

        switch (move) {
            case 'attack':
                const newHealth = Math.max(0, defender.currentHP - data.damage);
                updates[`${isCreator ? 'opponent' : 'creator'}.currentHP`] = newHealth;
                // Reset defender's defending state
                updates[`${isCreator ? 'opponent' : 'creator'}.isDefending`] = false;
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

        // Add battle status check
        if (updates[`${isCreator ? 'opponent' : 'creator'}.currentHP`] === 0) {
            updates.status = 'completed';
            updates.winner = user.uid;
            updates.endTime = firebase.firestore.FieldValue.serverTimestamp();
            this.handleBattleEnd(battleState, user.uid);
        }

        return updates;
    }

    async handleBattleEnd(battleState, winnerId) {
        const winner = winnerId === battleState.creator.uid ? 
            battleState.creator : battleState.opponent;
        const loser = winnerId === battleState.creator.uid ? 
            battleState.opponent : battleState.creator;

        try {
            const batch = this.db.batch();
            
            // Update winner stats
            const winnerRef = this.db.collection('users').doc(winner.uid);
            batch.set(winnerRef, {
                wins: firebase.firestore.FieldValue.increment(1)
            }, { merge: true });

            // Update loser stats
            const loserRef = this.db.collection('users').doc(loser.uid);
            batch.set(loserRef, {
                losses: firebase.firestore.FieldValue.increment(1)
            }, { merge: true });

            // Calculate XP gain
            const levelDiff = parseInt(loser.monsterData.level) - parseInt(winner.monsterData.level);
            const baseXP = 50;
            const xpGain = Math.max(baseXP + (levelDiff * 10), Math.floor(baseXP * 0.5));

            // Update winner's monster
            const winnerMonsterRef = this.db.collection('monsters').doc(winner.monster);
            const monsterDoc = await winnerMonsterRef.get();
            const currentExp = parseInt(monsterDoc.data().experience) || 0;
            const currentLevel = parseInt(monsterDoc.data().level) || 1;
            const newExp = currentExp + xpGain;
            const requiredXP = this.calculateRequiredXP(currentLevel);

            const monsterUpdates = {
                experience: newExp
            };

            // Check for level up
            if (newExp >= requiredXP) {
                monsterUpdates.level = currentLevel + 1;
                monsterUpdates.HP = Math.round(monsterDoc.data().HP * 1.2);
                monsterUpdates.AP = Math.round(monsterDoc.data().AP * 1.15);
                monsterUpdates.Speed = Math.round(monsterDoc.data().Speed * 1.1);
            }

            batch.update(winnerMonsterRef, monsterUpdates);

            // Commit all updates
            await batch.commit();

            return {
                xpGained: xpGain,
                currentXP: newExp,
                requiredXP,
                levelUp: monsterUpdates.level ? {
                    oldLevel: currentLevel,
                    newLevel: monsterUpdates.level,
                    newStats: {
                        HP: monsterUpdates.HP,
                        AP: monsterUpdates.AP,
                        Speed: monsterUpdates.Speed
                    }
                } : null
            };

        } catch (error) {
            console.error('Error handling battle end:', error);
            throw error;
        }
    }

    calculateRequiredXP(level) {
        return Math.floor(100 * Math.pow(1.5, level - 1));
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
            // Instead of creating/deleting an init document,
            // just create the battle document directly with the battleCode
            const userRef = this.db.collection('users').doc(userId);
            
            // Check if user document exists, create if not
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                await userRef.set({
                    battleStatus: null,
                    activeBattle: null,
                    activeBattleCreator: null
                }, { merge: true });
            }

            return true;
        } catch (error) {
            console.error('Error initializing battles:', error);
            throw error;
        }
    }

    // Add these missing helper methods
    static async getBattleById(creatorId, battleCode) {
        const db = firebase.firestore();
        return await db
            .collection('users')
            .doc(creatorId)
            .collection('battles')
            .doc(battleCode)
            .get();
    }

    // Add damage calculation directly in the manager
    calculateDamage(attacker, isPlayer = true) {
        const baseAP = parseInt(attacker.AP) || 5;
        const variance = Math.floor((Math.random() * 0.3 - 0.15) * baseAP);
        let damage = baseAP + variance;
        
        // Critical hit chance (10%)
        if (Math.random() < 0.1) {
            damage = Math.floor(damage * 1.5);
            return { damage, isCritical: true };
        }
        
        return { damage, isCritical: false };
    }
}

// Export the class
window.PvPBattleManager = PvPBattleManager;

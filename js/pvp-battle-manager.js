class PvPBattleManager {
    constructor(battleCode) {
        const user = firebase.auth().currentUser;
        this.battleCode = battleCode;
        // Store user reference
        this.userRef = firebase.firestore().collection('users').doc(user.uid);
        this.battleRef = this.userRef.collection('battles').doc(battleCode);
    }

    // Update the createBattle static method
    static async createBattle(monsterId, battleCode) {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('Not authenticated');

        try {
            const monsterDoc = await firebase.firestore()
                .collection('monsters')
                .doc(monsterId)
                .get();

            if (!monsterDoc.exists || monsterDoc.data().ownerId !== user.uid) {
                throw new Error('Monster not found or not owned by user');
            }

            const battleData = {
                battleCode,
                creator: {
                    uid: user.uid,
                    monster: monsterId,
                    monsterData: monsterDoc.data(),
                    ready: true,
                    currentHP: monsterDoc.data().HP
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
}

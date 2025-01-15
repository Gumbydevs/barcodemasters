(function(global) {
    const monsterStats = {
        calculateMaxHP: function(level) {
            return level * 100;
        },
        
        // XP needed to reach next level - increased scaling
        calculateXPForNextLevel: function(currentLevel) {
            const baseXP = 150; // Increased from 100 to 150
            return Math.floor(baseXP * Math.pow(1.75, currentLevel - 1)); // Increased multiplier from 1.5 to 1.75
        },
        
        // Total XP needed from level 1 to reach target level
        calculateTotalXPToLevel: function(targetLevel) {
            let total = 0;
            for(let i = 1; i < targetLevel; i++) {
                total += this.calculateXPForNextLevel(i);
            }
            return total;
        },

        // Check if monster can level up
        canLevelUp: function(currentLevel, totalXP) {
            try {
                return totalXP >= this.calculateTotalXPToLevel(currentLevel + 1);
            } catch (error) {
                console.warn('Level up check fallback used');
                return false;
            }
        },

        // Add new helper functions for consistent XP display
        getCurrentLevelXP: function(totalXP, currentLevel) {
            if (!totalXP || !currentLevel) return 0;
            let prevLevelXP = 0;
            for(let i = 1; i < currentLevel; i++) {
                prevLevelXP += this.calculateXPForNextLevel(i);
            }
            return Math.max(0, totalXP - prevLevelXP);
        },

        getXPInfo: function(monster) {
            const currentExp = monster.experience || 0;
            const currentLevel = monster.level || 1;
            const totalXPForCurrentLevel = this.calculateTotalXPToLevel(currentLevel);
            const nextLevelXP = this.calculateXPForNextLevel(currentLevel);
            const currentLevelXP = Math.max(0, currentExp - totalXPForCurrentLevel);
            const xpProgress = (currentLevelXP / nextLevelXP) * 100;

            return {
                currentLevelXP,
                nextLevelXP,
                totalXP: currentExp,
                progress: Math.min(100, Math.max(0, xpProgress)),
                shouldLevelUp: currentExp >= (totalXPForCurrentLevel + nextLevelXP)
            };
        },

        // Add failsafe wrappers with error checking
        getCurrentLevelXPSafe: function(totalXP, currentLevel) {
            try {
                return this.getCurrentLevelXP(totalXP, currentLevel);
            } catch (error) {
                console.warn('Fallback XP calculation used');
                const totalForCurrentLevel = this.calculateTotalXPToLevel(currentLevel);
                return Math.max(0, totalXP - totalForCurrentLevel);
            }
        }
    };

    // Ensure global availability
    global.monsterStats = monsterStats;
})(typeof window !== 'undefined' ? window : global);

// Update the level up check in the handleVictory function:
// Replace this section in handleVictory:
if (newExp >= currentLevel * 100) {
    // Replace with:
    if (monsterStats.canLevelUp(currentLevel, newExp)) {
        const newLevel = currentLevel + 1;
        updates.level = newLevel;
        updates.HP = Math.round(doc.data().HP * 1.2);
        updates.AP = Math.round(doc.data().AP * 1.15);
        updates.Speed = Math.round(doc.data().Speed * 1.1);
        // ...rest of level up code...
    }
}

window.monsterStats = {
    calculateTotalXPToLevel: function(level) {
        if (!level || level < 1) return 0;
        let total = 0;
        for(let i = 1; i < level; i++) {
            total += this.calculateXPForNextLevel(i);
        }
        return total;
    },

    calculateXPForNextLevel: function(currentLevel) {
        if (!currentLevel || currentLevel < 1) return 150;
        return Math.floor(150 * Math.pow(1.75, currentLevel - 1));
    },

    canLevelUp: function(currentLevel, totalExp) {
        if (!currentLevel || currentLevel < 1) return false;
        return totalExp >= this.calculateTotalXPToLevel(currentLevel + 1);
    }
};

// Example XP requirements:
// Level 1 to 2: 150 XP
// Level 2 to 3: 263 XP
// Level 3 to 4: 460 XP
// Level 4 to 5: 805 XP
// Level 5 to 6: 1,409 XP
// Level 6 to 7: 2,465 XP
// Level 7 to 8: 4,314 XP
// Level 8 to 9: 7,550 XP
// Level 9 to 10: 13,212 XP

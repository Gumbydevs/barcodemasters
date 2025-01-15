(function(global) {
    const monsterStats = {
        calculateMaxHP: function(level) {
            return level * 100;
        },
        
        // XP needed to reach next level - exponential scaling
        calculateXPForNextLevel: function(currentLevel) {
            if (!currentLevel || currentLevel < 1) return 150;
            const baseXP = 150;
            const multiplier = Math.pow(1.75, currentLevel - 1);
            return Math.floor(baseXP * multiplier);
        },
        
        // Total XP needed from level 1 to reach target level
        calculateTotalXPToLevel: function(targetLevel) {
            // Always return 0 for level 1 since no XP is needed to be level 1
            if (!targetLevel || targetLevel <= 1) return 0;
            
            let total = 0;
            // Calculate XP needed for each level up to current level
            for (let i = 1; i < targetLevel; i++) {
                const xpForLevel = this.calculateXPForNextLevel(i);
                total += xpForLevel;
                console.log(`Level ${i} to ${i+1} requires: ${xpForLevel} XP (Total: ${total})`);
            }
            return total;
        },

        // Check if monster can level up
        canLevelUp: function(currentLevel, totalXP) {
            if (!currentLevel || currentLevel < 1) return false;
            const requiredExp = this.calculateTotalXPToLevel(currentLevel + 1);
            console.log('Level up check:', {
                currentLevel,
                totalXP,
                requiredExp,
                canLevel: totalXP >= requiredExp
            });
            return totalXP >= requiredExp;
        },

        // Get current level XP progress
        getCurrentLevelXP: function(totalXP, currentLevel) {
            if (!totalXP || !currentLevel) return 0;
            const prevLevelTotal = this.calculateTotalXPToLevel(currentLevel);
            const currentLevelXP = Math.max(0, totalXP - prevLevelTotal);
            
            console.log('getCurrentLevelXP:', {
                totalXP,
                currentLevel,
                prevLevelTotal,
                currentLevelXP
            });
            
            return currentLevelXP;
        },

        // Get complete XP info for a monster
        getXPInfo: function(monster) {
            if (!monster) return null;
            
            const currentExp = parseInt(monster.experience) || 0;
            const currentLevel = parseInt(monster.level) || 1;
            
            // Get XP requirements
            const totalXPForCurrentLevel = this.calculateTotalXPToLevel(currentLevel);
            const nextLevelXP = this.calculateXPForNextLevel(currentLevel);
            const currentLevelXP = this.getCurrentLevelXP(currentExp, currentLevel);
            
            console.log('XP Info Calculation:', {
                monster: {
                    name: monster.monsterName,
                    level: currentLevel,
                    totalExp: currentExp
                },
                xpCalc: {
                    totalXPForCurrentLevel,
                    nextLevelXP,
                    currentLevelXP
                }
            });

            // Calculate progress percentage
            const xpProgress = (currentLevelXP / nextLevelXP) * 100;

            return {
                currentLevelXP,
                nextLevelXP,
                totalXP: currentExp,
                progress: Math.min(100, Math.max(0, xpProgress)),
                shouldLevelUp: currentExp >= (totalXPForCurrentLevel + nextLevelXP)
            };
        }
    };

    // Ensure global availability
    global.monsterStats = monsterStats;
})(typeof window !== 'undefined' ? window : global);

/* Example XP requirements:
Level 1 to 2: 150 XP
Level 2 to 3: 263 XP
Level 3 to 4: 460 XP
Level 4 to 5: 805 XP
Level 5 to 6: 1,409 XP
Level 6 to 7: 2,465 XP
Level 7 to 8: 4,314 XP
Level 8 to 9: 7,550 XP
Level 9 to 10: 13,212 XP */

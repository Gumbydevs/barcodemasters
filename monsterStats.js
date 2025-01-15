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
            if (!targetLevel || targetLevel <= 1) return 0;
            
            let total = 0;
            for (let i = 1; i < targetLevel; i++) {
                total += this.calculateXPForNextLevel(i);
            }
            return total;
        },

        // Get current level progress information
        getCurrentLevelProgress: function(totalXP, level) {
            const currentLevelStart = this.calculateTotalXPToLevel(level);
            const nextLevelStart = this.calculateTotalXPToLevel(level + 1);
            const levelProgress = totalXP - currentLevelStart;
            const levelRange = nextLevelStart - currentLevelStart;
            
            return {
                progress: (levelProgress / levelRange) * 100,
                currentXP: levelProgress,
                requiredXP: levelRange
            };
        },

        // Check if monster can level up
        canLevelUp: function(currentLevel, totalXP) {
            if (!currentLevel || currentLevel < 1) return false;
            const nextLevelTotalXP = this.calculateTotalXPToLevel(currentLevel + 1);
            return totalXP >= nextLevelTotalXP;
        },

        // Get current level XP progress
        getCurrentLevelXP: function(totalXP, currentLevel) {
            if (!totalXP || !currentLevel) return 0;
            const prevLevelTotal = this.calculateTotalXPToLevel(currentLevel);
            return Math.max(0, totalXP - prevLevelTotal);
        },

        // Get complete XP info for a monster
        getXPInfo: function(monster) {
            if (!monster) return null;
            
            const currentExp = parseInt(monster.experience) || 0;
            const currentLevel = parseInt(monster.level) || 1;
            const progress = this.getCurrentLevelProgress(currentExp, currentLevel);
            
            return {
                currentLevelXP: progress.currentXP,
                nextLevelXP: progress.requiredXP,
                totalXP: currentExp,
                progress: Math.min(100, Math.max(0, progress.progress)),
                shouldLevelUp: this.canLevelUp(currentLevel, currentExp)
            };
        }
    };

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

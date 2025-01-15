const monsterStats = {
    calculateMaxHP: function(level) {
        return level * 100;
    },
    
    // XP needed to reach next level
    calculateXPForNextLevel: function(currentLevel) {
        const baseXP = 100;
        return Math.floor(baseXP * Math.pow(1.5, currentLevel - 1));
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
        return totalXP >= this.calculateTotalXPToLevel(currentLevel + 1);
    }
};

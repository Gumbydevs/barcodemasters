// tooltips.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDoIWAIUt4HC1RcNmdfXozEr0NG65GO63s",
    authDomain: "barcodemasters-b4b9b.firebaseapp.com",
    projectId: "barcodemasters-b4b9b",
    storageBucket: "barcodemasters-b4b9b.firebasestorage.app",
    messagingSenderId: "827677074735",
    appId: "1:827677074735:web:3bace3d02034348bc82dda",
    measurementId: "G-14YTBBLTPZ"
};

// Initialize Firebase once
let app;
try {
    app = initializeApp(firebaseConfig);
} catch (e) {
    app = getApp();
}
const db = getFirestore(app);

// Static tips array
const staticTips = [
    // Scanning Tips
    "QR codes have a higher success rate for DNA extraction than barcodes - try scanning QR codes first!",
    "Hold your device steady and center the code in the scanning frame for best DNA extraction results",
    "Keep your device 6-8 inches away from codes when scanning for optimal recognition",
    "Good lighting and a stable surface help improve barcode scanning success",
    "Keep your device steady for several seconds when scanning - movement can disrupt DNA extraction",
    
    // Core Game Mechanics
    "Each monster's base stats are determined by the DNA code you scan - no two monsters will be exactly alike",
    "Train your monsters regularly - training times increase with higher stat levels",
    "Your MVP monster is your highest level creature - keep training to make it stronger!",
    "Monster stats affect battle performance: HP for survival, AP for damage, Speed for initiative",
    "Training a stat takes longer as the stat value increases - plan your training time wisely",
    "Monitor your monster's XP bar - level ups improve all stats!",
    "Your daily DNA extraction limit resets at midnight local time",
    
    // Battle System
    "Battle AI opponents to gain experience and level up your monsters",
    "Higher level AI opponents give more experience when defeated",
    "Defending in battle reduces incoming damage by 50% for one turn",
    "Healing restores HP based on your monster's maximum health",
    "Battle rewards scale with opponent level - challenge stronger foes for better rewards",
    "Compare your monster's stats with AI opponents before starting a battle",
    "Watch both your monster's and opponent's health bars during battle",
    "Having trouble winning? Take time to train your monster's stats before trying again",
    
    // UI Navigation & Features
    "Click on any monster card in your collection to see detailed stats and available actions",
    "Start a battle directly from your collection by expanding a monster's card and clicking 'Select for Battle'",
    "Click the dark mode toggle in the top right to switch between light and dark themes",
    "Sort your monster collection by level, date, or stats using the dropdown filters",
    "Filter your monster collection by type or level to find specific monsters quickly",
    "Toggle between compact and expanded views by clicking on monster cards",
    "Each page has a dedicated navigation grid for easy access to other features",
    "Use the battle preview screen to check opponent stats before starting a fight",
    
    // Profile & Customization
    "Customize your profile picture by clicking the 'Change Profile Photo' button on your profile page",
    "Find your highest level monster's stats in the MVP section of your profile",
    "Rename your monsters by expanding their card and clicking the rename button",
    "Monitor your collection completion percentage from your profile",
    
    // Stats & Progress
    "Check the Monster Index to see all monsters created by players worldwide",
    "View your battle stats and highest level monster from your Profile page",
    "Check the Leaderboard to see how you rank against other players",
    "Track your collection completion percentage to see how many types you've collected",
    "View detailed monster type descriptions by expanding monster cards",
    
    // Tips & Strategies
    "Each monster type has unique strengths - experiment with different types in battle",
    "Maintain a diverse collection of monster types for different battle strategies",
    "Check a monster's training status before selecting it for battle - monsters can't battle while training",
    "Watch for the 'Busy' indicator on monsters that are currently training",
    "Training times increase with stat levels - start with lower stats for quicker training sessions",
    
    // Troubleshooting & Support
    "Experiencing odd behavior? Try refreshing the page first",
    "Check the Change Log in the footer for latest updates and fixes",
    "Join our Discord community for help and tips from other players",
    "Having technical issues? Report them on our Discord for quick support",
    "Can't find a feature? Check the Help page or ask on Discord",
    "Updates and new features are regularly added - check the Change Log to stay informed",
    
    // Original Fun Tips
    "Warning: Scanning barcodes may cause uncontrollable excitement",
    "Your scanner is powered by pure curiosity. And maybe a little magic",
    "Scanning barcodes is like opening a box of chocolates... you never know what you're gonna get",
    "The world of Barcode Masters is full of mysteries waiting to be uncovered with the right scan",
    "Scanning is the secret to life, the universe, and everything - or at least to finding cool monsters",
    "Each barcode has a story – scan them all to piece together the mystery!",
    
    // Additional Navigation Tips
    "Access the Help page from any screen using the navigation grid",
    "Find your way back to Profile using the navigation buttons",
    "Check your remaining DNA extractions for the day in the DNA Extractor page",
    "Sort monsters by different criteria to find your strongest team members",
    "Use the Global Monster Index to track worldwide discoveries",
    
    // Performance Tips
    "Clear your browser cache if images aren't loading correctly",
    "Make sure you have a stable internet connection for battles",
    "Keep your device's camera lens clean for better scanning results",
    "Some older devices may have trouble with barcode scanning - try a QR code instead",

    //Events
    "Don't forget to cast your vote for Monster of the Week!",
    "Haven't voted yet? Make your voice heard in this week's Monster of the Week poll!",
    "Head over to the Monster Index to cast your vote for Monster of the Week!",
    
    // Community & Updates
    "Share your strategies and discoveries with other players in Discord",
    "Found a bug? Let us know on Discord - we're always improving",
    "Follow our Discord announcements for news about upcoming features",
    "Help other players by sharing your battle strategies in Discord",
    "Check Discord for community events and competitions"
];

// Function to get global stats
async function getGlobalStats(db) {
    try {
        const monstersRef = collection(db, "monsters");
        const usersRef = collection(db, "users");
        
        const [monsterSnapshot, userSnapshot] = await Promise.all([
            getDocs(monstersRef),
            getDocs(usersRef)
        ]);

        // Get highest level monster and count unique types
        let highestLevel = 0;
        const uniqueTypes = new Set();
        monsterSnapshot.forEach(doc => {
            const level = doc.data().level || 0;
            const type = doc.data().type;
            if (level > highestLevel) highestLevel = level;
            if (type) uniqueTypes.add(type);
        });

        return {
            totalMonsters: monsterSnapshot.size,
            discoveredTypes: uniqueTypes.size,
            totalPlayers: userSnapshot.size,
            highestLevel: highestLevel
        };
    } catch (error) {
        console.error("Error fetching global stats:", error);
        return null;
    }
}

// Function to get dynamic tips
async function getDynamicTips(db) {
    const stats = await getGlobalStats(db);
    if (!stats) return [];

    return [
        `There are currently ${stats.totalMonsters.toLocaleString()} monsters discovered worldwide!`,
        `Players have discovered ${stats.discoveredTypes} unique monster types so far`,
        `You are part of a growing community of ${stats.totalPlayers} active monster hunters`,
        `The highest level monster so far is level ${stats.highestLevel}!`
    ];
}

// Main update function to be exported
export async function updateGameTip(elementId = 'gameTip', interval = 20000) {
    const tipElement = document.getElementById(elementId);
    if (!tipElement) return;

    async function setNewTip() {
        try {
            // Get dynamic tips using the initialized db
            const dynamicTips = await getDynamicTips(db);
            const allTips = [...dynamicTips, ...staticTips];
            const randomTip = allTips[Math.floor(Math.random() * allTips.length)];
            
            tipElement.style.transition = 'opacity 0.5s ease';
            tipElement.style.opacity = '0';
            
            setTimeout(() => {
                tipElement.textContent = randomTip;
                tipElement.style.opacity = '1';
            }, 500);
        } catch (error) {
            console.error("Error updating game tip:", error);
            const randomTip = staticTips[Math.floor(Math.random() * staticTips.length)];
            tipElement.textContent = randomTip;
        }
    }

    // Set initial tip
    await setNewTip();

    // Return the interval ID if interval is provided
    if (interval > 0) {
        return setInterval(setNewTip, interval);
    }
}

// Export the update function
export default updateGameTip;
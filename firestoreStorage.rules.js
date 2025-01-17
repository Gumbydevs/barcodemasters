rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Base match for monster images
    match /monster-images/{imageId} {
      // Allow admin full access to all monster images
      allow read, write, delete: if request.auth != null && 
        request.auth.uid == 'Ngi2V2EdcFUeALSJjmY6XxfyxqL2';
      
      // Allow users to read/write their own monster images
      allow read: if request.auth != null &&
        imageId.matches('.*-' + request.auth.uid + '.png');
        
      allow write, create: if request.auth != null &&
        imageId.matches('.*-' + request.auth.uid + '.png') &&
        request.resource.contentType.matches('image/.*') &&
        request.resource.size < 5 * 1024 * 1024;
    }
    // New rules for AI opponent images
    match /robotAiOpponent-images/{imageId} {
      // Allow all authenticated users to read AI opponent images
      allow read: if request.auth != null;
      
      // Only admin can modify AI opponent images
      allow write, create, delete: if request.auth != null && 
        request.auth.uid == 'Ngi2V2EdcFUeALSJjmY6XxfyxqL2';
    }
    // Existing profile images rules
    match /profile-images/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.uid == userId || 
         request.auth.uid == 'Ngi2V2EdcFUeALSJjmY6XxfyxqL2');
    }
    // New user images rules for the new profile system
    match /user-images/{userId} {
      // Allow authenticated users to view profile images
      allow read: if request.auth != null;
      
      // Allow users to upload their own profile image and admin to manage all
      allow write: if request.auth != null && 
        (request.auth.uid == userId || 
         request.auth.uid == 'Ngi2V2EdcFUeALSJjmY6XxfyxqL2') &&
        request.resource.contentType.matches('image/.*') &&
        request.resource.size < 2 * 1024 * 1024;
    }
    // Default deny for unmatched paths
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
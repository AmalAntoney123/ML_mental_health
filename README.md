# Emo - Mental Health & Wellbeing App

Emo is a comprehensive mental health and wellbeing app designed to help users improve their mental and emotional health through mindfulness, gratitude, social activities, and other gamified challenges. The app provides users with various tools and exercises to enhance their wellbeing and track their progress over time.

## Features

- **Mindfulness Challenges:** Engage in guided meditation and breathing exercises with animations and background music.
- **Gratitude Journal:** Enter at least 5 things you're grateful for, with a progress bar showing your completion status.
- **Social Challenges:** Complete easy social tasks designed to improve social skills and wellbeing.
- **Dashboard:** A central hub that presents various challenges such as Mindfulness, Gratitude, Exercise, Social, journal, Sleep, and positivity, each leading to specific challenge screens.
- **User Profiles:** Track user progress and maintain a daily streak by completing challenges.
- **Admin Panel:** Manage app content and user data with a dedicated admin panel.

## Installation

### Prerequisites

- Node.js and npm installed
- React Native development environment set up
- Firebase account and project created

### Clone the repository

\`\`\`bash
git clone https://github.com/amalantoney123/Emo-app-react-native.git
cd emo
\`\`\`

### Install dependencies

\`\`\`bash
npm install
\`\`\`

### Set up Firebase

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).
2. Configure Firebase Realtime Database.
3. Copy your Firebase config and add it to your React Native project.

### Run the app

\`\`\`bash
npm start
\`\`\`

Or if you want to run it on a specific platform:

\`\`\`bash
npm run android
\`\`\`

\`\`\`bash
npm run ios
\`\`\`

## Usage

1. Launch the app on your device or emulator.
2. Complete the onboarding process to set up your user profile.
3. Explore the different challenges and start working on improving your mental wellbeing.
4. Track your progress and streaks through the Dashboard.
5. Admins can access the Admin Panel to manage content and users.

## Tech Stack

- **React Native:** Cross-platform mobile app development
- **Firebase:** Realtime Database for storing user data and app state
- **Lottie:** For animations in various screens
- **Custom Hooks and Contexts:** Manage app state and theme

## Project Structure

- \`src/\`
  - \`components/\`: Reusable UI components
  - \`screens/\`: Different screens like Login, Dashboard, Mindfulness, Gratitude, Admin, etc.
  - \`navigation/\`: App navigation and routing setup
  - \`context/\`: Theme and state management
  - \`assets/\`: Images, animations, and other static assets

## Contribution

Feel free to fork the repository and submit pull requests. Contributions are welcome!

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

## Contact

If you have any questions, feel free to reach out:

- **Email:** youremail@example.com
- **GitHub:** [yourusername](https://github.com/amalantoney123)
"""

# Writing to the file
with open('/mnt/data/readme.md', 'w') as file:
    file.write(readme_content)

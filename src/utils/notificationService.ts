import PushNotification from 'react-native-push-notification';

const JOURNAL_NOTIFICATION_ID = 'daily-journal-reminder';
const MORNING_MOTIVATION_ID = 'morning-inspiration';

const journalTitles = [
  "Moment of Reflection",
  "Pause and Ponder",
  "Your Daily Story",
  "Capture the Day",
  "Time for You",
  "Mindful Moments",
  "Today's Chapter",
  "Your Thoughts Matter",
];

const journalMessages = [
  "Take a breath and capture your day's journey. Open your journal now.",
  "Your thoughts matter. How about jotting them down in your journal?",
  "A moment of reflection can brighten your whole day. Enter your journal and start writing.",
  "Your story is unique. Why not write a page of it in your journal?",
  "Pause, breathe, and let your thoughts flow onto paper. Your journal is waiting.",
  "What made you smile today? It's worth remembering. Open your journal and write it down.",
  "Your journal is a friend always ready to listen. Why not have a chat with it now?",
  "Capture a moment, preserve a memory. Enter your journal and start writing.",
  "Every day has a lesson. What did you learn today? Record it in your journal.",
  "Your words have power. Let them inspire you by writing in your journal now.",
  "It's time for your daily reflection. Open your journal and start writing.",
  "Your journal is your personal time capsule. Add to it now.",
  "A few minutes of journaling can change your whole perspective. Start now.",
  "Your future self will thank you for journaling today. Open your app and begin.",
  "Ready to unwind? Your journal is the perfect place to start. Open it now.",
];

const inspirationTitles = [
  "A New Day Dawns",
  "Morning Whispers",
  "Sunrise Inspiration",
  "Daily Spark",
  "Fresh Beginnings",
  "Today's Potential",
  "Morning Magic",
  "Embrace the Day",
];

const getRandomItem = (array: string[]) => {
  return array[Math.floor(Math.random() * array.length)];
};

const randomMotivationTitles = [
  "A Little Boost",
  "You've Got This",
  "Moment of Inspiration",
  "Keep Going",
  "Positive Vibes",
  "Quick Reminder",
  "You're Awesome",
  "Believe in Yourself",
  "Time to Shine",
  "Embrace the Journey",
  "Your Daily Dose",
  "Motivation Station",
  "Power Through",
  "Spark of Encouragement",
  "Uplift Your Spirit",
  "Fuel for Success",
  "Confidence Booster",
  "Inspiration Alert",
  "Positivity Ping",
  "Strength Within",
];

const randomMotivationMessages = [
  "You're doing great! Keep up the good work!",
  "Remember, every step forward is progress.",
  "Your efforts today will pay off tomorrow.",
  "You have the power to make this day amazing!",
  "Don't forget to celebrate your small wins!",
  "You're stronger than you think. Keep pushing!",
  "Take a moment to appreciate how far you've come.",
  "Your positive attitude is your superpower!",
  "Believe in yourself and all that you are capable of.",
  "Today is full of possibilities. Make the most of it!",
  "You've got this! Stay focused and determined.",
  "Your potential is limitless. Keep reaching for the stars!",
  "Every challenge you face is an opportunity to grow.",
  "Your hard work is planting the seeds for future success.",
  "Remember why you started, and let that drive you forward.",
  "You are capable of amazing things. Trust yourself!",
  "Small progress is still progress. Keep going!",
  "Your journey is unique. Embrace every step of it.",
  "You have the strength to overcome any obstacle.",
  "Today's efforts are tomorrow's achievements. Stay motivated!",
];

export const scheduleNotification = () => {
  console.log('Setting up notification scheduler...');
  
  const now = new Date();
  const scheduledTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 30, 0, 0);
  
  // If it's already past 11:04 PM, schedule for the next day
  if (now > scheduledTime) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  // Cancel any existing notification with the same ID
  PushNotification.cancelLocalNotification(JOURNAL_NOTIFICATION_ID);

  PushNotification.localNotificationSchedule({
    channelId: "journal-reminders",
    id: JOURNAL_NOTIFICATION_ID,
    title: getRandomItem(journalTitles),
    message: getRandomItem(journalMessages),
    date: scheduledTime,
    allowWhileIdle: true,
    repeatType: 'day',
    repeatTime: 1,
  });
};

export const triggerManualNotification = () => {
  console.log('Triggering manual notification...');
  PushNotification.localNotification({
    channelId: "journal-reminders",
    title: getRandomItem(journalTitles),
    message: getRandomItem(journalMessages),
    allowWhileIdle: true,
  });
};

export const scheduleMorningNotification = () => {
  console.log('Setting up morning notification scheduler...');
  
  const now = new Date();
  const scheduledTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0, 0);
  
  // If it's already past 7:00 AM, schedule for the next day
  if (now > scheduledTime) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  // Cancel any existing notification with the same ID
  PushNotification.cancelLocalNotification(MORNING_MOTIVATION_ID);

  PushNotification.localNotificationSchedule({
    channelId: "morning-motivation",
    id: MORNING_MOTIVATION_ID,
    title: getRandomItem(inspirationTitles),
    message: getRandomMotivationalQuote(),
    date: scheduledTime,
    allowWhileIdle: true,
    repeatType: 'day',
    repeatTime: 1,
  });
};

const getRandomMotivationalQuote = () => {
  const quotes = [
    "Believe you can and you're halfway there.",
    "The only way to do great work is to love what you do.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "Your time is limited, don't waste it living someone else's life.",
    "The future belongs to those who believe in the beauty of their dreams.",
    "Every day is a new beginning. Take a deep breath and start again.",
    "The secret of getting ahead is getting started.",
    "Don't watch the clock; do what it does. Keep going.",
    "The only limit to our realization of tomorrow will be our doubts of today.",
    "Strive not to be a success, but rather to be of value.",
    "The way to get started is to quit talking and begin doing.",
    "Happiness is not something readymade. It comes from your own actions.",
    "The only person you are destined to become is the person you decide to be.",
    "It always seems impossible until it's done.",
    "You are never too old to set another goal or to dream a new dream."
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
};

export const triggerMorningMotivation = () => {
  console.log('Triggering manual morning inspiration...');
  PushNotification.localNotification({
    channelId: "morning-motivation",
    title: getRandomItem(inspirationTitles),
    message: getRandomMotivationalQuote(),
    allowWhileIdle: true,
  });
};

export const scheduleRandomMotivation = () => {
  console.log('Setting up random motivation scheduler...');
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const timePeriods = [
    { start: 7, end: 12 },  // Morning: 7 AM - 10 AM
    { start: 12, end: 17 }, // Afternoon: 10 AM - 3 PM
    { start: 17, end: 22 }  // Evening: 3 PM - 10 PM
  ];

  timePeriods.forEach((period, index) => {
    const startTime = new Date(today.getTime());
    startTime.setHours(period.start, 0, 0, 0);
    
    const endTime = new Date(today.getTime());
    endTime.setHours(period.end, 0, 0, 0);

    // If the current time is past this period, schedule for tomorrow
    if (now > endTime) {
      startTime.setDate(startTime.getDate() + 1);
      endTime.setDate(endTime.getDate() + 1);
    }

    // If the current time is within this period, adjust the start time
    if (now > startTime && now < endTime) {
      startTime.setTime(now.getTime());
    }

    // Generate a random time within this period
    const randomTime = new Date(startTime.getTime() + Math.random() * (endTime.getTime() - startTime.getTime()));

    PushNotification.localNotificationSchedule({
      channelId: "random-motivation",
      id: `random-motivation-${index}`, // Use a consistent ID for each period
      title: getRandomItem(randomMotivationTitles),
      message: getRandomItem(randomMotivationMessages),
      date: randomTime,
      allowWhileIdle: true,
    });

    console.log(`Random motivation for period ${index + 1} scheduled for ${randomTime.toLocaleTimeString()}`);
  });

  // Schedule the next day's motivations
  const tomorrowMorning = new Date(today.getTime());
  tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
  tomorrowMorning.setHours(7, 0, 0, 0);

  const timeUntilTomorrow = tomorrowMorning.getTime() - now.getTime();
  setTimeout(() => scheduleRandomMotivation(), timeUntilTomorrow);
};

export const triggerRandomMotivation = () => {
  console.log('Triggering manual random motivation...');
  PushNotification.localNotification({
    channelId: "random-motivation",
    title: getRandomItem(randomMotivationTitles),
    message: getRandomItem(randomMotivationMessages),
    allowWhileIdle: true,
  });
};
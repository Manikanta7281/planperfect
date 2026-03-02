import { gapi } from 'gapi-script';

// It is highly recommended to store API keys and client IDs in a .env file locally 
// using VITE_GOOGLE_API_KEY and VITE_GOOGLE_CLIENT_ID
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || 'YOUR_API_KEY_HERE';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

export const initGoogleClient = () => {
    return new Promise((resolve, reject) => {
        gapi.load('client:auth2', () => {
            gapi.client.init({
                apiKey: API_KEY,
                clientId: CLIENT_ID,
                discoveryDocs: DISCOVERY_DOCS,
                scope: SCOPES,
            }).then(() => {
                resolve(gapi.auth2.getAuthInstance());
            }).catch((error) => {
                reject(error);
            });
        });
    });
};

/**
 * Fetches events between a specific start and end time.
 * @param {Date} dateStart - The start of the day (e.g., 6:00 AM)
 * @param {Date} dateEnd - The end of the day (e.g., 10:00 PM)
 */
export const fetchCalendarEvents = async (dateStart, dateEnd) => {
    try {
        const response = await gapi.client.calendar.events.list({
            calendarId: 'primary',
            timeMin: dateStart.toISOString(),
            timeMax: dateEnd.toISOString(),
            showDeleted: false,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = response.result.items;

        // Convert Google events into our PlanPerfect task format
        return events.map((event) => {
            const startDateTime = event.start.dateTime || event.start.date;
            const endDateTime = event.end.dateTime || event.end.date;

            const startTimeObj = new Date(startDateTime);
            // Format to a readable string like "09:00 AM" manually or using date-fns in App.jsx
            const timeString = startTimeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return {
                id: event.id,
                time: timeString,
                rawStartTime: startDateTime, // useful for collision detection
                rawEndTime: endDateTime,
                task: event.summary,
                type: "Google Event", // Using this label to visually distinguish Read-Only tasks
                isReadOnly: true
            };
        });
    } catch (error) {
        console.error("Error fetching Google Calendar events", error);
        return [];
    }
};

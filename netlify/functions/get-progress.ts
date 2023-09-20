
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { JWT } from "google-auth-library";
import { google } from 'googleapis';
import type { TaskData } from "../../src/components/Task";

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const SHEET_ID = "1SzjlzhnZKmlzCrzb2lx8CE9cUwITn-sT6xZojdFPDv8";

async function getSheet() {
  const client = new JWT({
    email: "service@testing-for-soar-progress.iam.gserviceaccount.com",
    key: process.env.GOOGLE_SHEET_KEY,
    scopes: SCOPES,
  });

  await client.authorize();

  const sheets = google.sheets({version: 'v4', auth: client });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1',
  });
  
  return res.data;
}

// TODO: Make a function that loops over a sheet and returns the data that goes with the email.
function getTasks(sheet: any, email: string): TaskData[] {
  // These are placeholder tasks.
  return [
    {
      name: "Test 1",
      completed: false
    },
    {
      name: "Test 2",
      completed: true
    }
  ]
}

/** Queries the sheet for the data for a specific user. */
// TODO: Add parsing. The getSheet function has access to the entire google sheet. It should query for all of the relevant sheets and look for one that has the correct name. Then you should return JSON.stringify of that data.
// TODO: This also needs to check and make sure that the user being queried is the same one that was authenticated. I guess some kind of token should be passed here.
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (!event.queryStringParameters) {
    return {
      statusCode: 400,
    };
  }

  const { email } = event.queryStringParameters;

  if (!email) {
    return {
      statusCode: 400,
    };
  } 

  const sheet = getSheet();
  const data = getTasks(sheet, email);

  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
};

export { handler };

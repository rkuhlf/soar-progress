
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { JWT } from "google-auth-library";
import { google, sheets_v4 } from 'googleapis';
import type { TaskData } from "../../src/components/Task";

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const SHEET_ID = "1SzjlzhnZKmlzCrzb2lx8CE9cUwITn-sT6xZojdFPDv8";
const GOOGLE_SHEET_KEY = process.env.GOOGLE_SHEET_KEY?.split(String.raw`\n`).join('\n');

if (!GOOGLE_SHEET_KEY) {
  throw Error("Could not determine google sheet key.");
}

async function getSheet() {
  const client = new JWT({
    email: "service@testing-for-soar-progress.iam.gserviceaccount.com",
    key: GOOGLE_SHEET_KEY,
    scopes: SCOPES,
  });

  await client.authorize();

  const sheets = google.sheets({version: 'v4', auth: client });
  const res = await sheets.spreadsheets.values.batchGet({
    ranges: ["Pilot Your Potential", "Elevate Your Expectations", "Look to Launch", "Take Flight", "Increase Your Altitude 1", "Increase Your Altitude 2"],
    spreadsheetId: SHEET_ID,
  });
  
  return res.data;
}

function nameMatches(name: string, firstName: string, lastName: string): boolean {
  lastName = lastName.trim();
  firstName = firstName.trim();

  return `${firstName} ${lastName}` == name || `${lastName} ${firstName}` == name;
}

function getTasks(sheet: sheets_v4.Schema$BatchGetValuesResponse, name: string, email: string): TaskData[] {
  if (!sheet.valueRanges) {
    throw new Error("Could not find value ranges.");
  }

  for (const valueRange of sheet.valueRanges) {
    const values = valueRange.values;

    if (!values) {
      throw new Error("Could not find value ranges.");
    }

    let row = -1;

    for (let i = 4; i < values.length; i++) {
      let lastName: string = values[i][1];
      let firstName: string = values[i][2];
      let nickname: string = values[i][3];
      let rowEmail: string = values[i][7];

      if (!lastName || !firstName) {
        break;
      }

      if (nameMatches(name, firstName, lastName) || nameMatches(name, nickname, lastName) || rowEmail.trim() == email) {
        row = i;
        break;
      }
    }

    // We didn't find them in this one.
    if (row == -1) {
      continue;
    }

    // Iterate over all of the tasks that are on the list.
    const tasks: TaskData[] = [];

    let currentTask = {
      name: "",
      completed: 0,
      required: 0,
    }

    for (let i = 9; i < 20; i++) {
      const name = values[3][i];
      const completed = values[row][i];

      if (name != "" && name != currentTask.name) {
        currentTask = {
          name,
          completed: 0,
          required: 0,
        };
        tasks.push(currentTask);
      }

      currentTask.required += 1;
      if (completed == "TRUE") {
        currentTask.completed += 1;
      }
    }

    return tasks;
  }

  throw new Error("Could not find tasks");
}

async function getInfo(access_token: string) {
  return await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${access_token}`, {
    headers: {
      Authorization: `Bearer ${access_token}`,
      Accept: 'application/json'
    }
  })
  .then((res) => {
    return res.json();
  })
  .then((data: any): {name: string, email: string} => {
    return {name: data.name, email: data.email};
  })
  .catch((err) => console.log(err));
}

/** Queries the sheet for the data for a specific user. */
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (!event.queryStringParameters) {
    return {
      statusCode: 400,
      body: "Could not find any query string parameters."
    };
  }

  const { access_token } = event.queryStringParameters;

  if (!access_token) {
    return {
      statusCode: 400,
      body: "Could not destructure the access token."
    };
  } 

  const info = await getInfo(access_token);

  if (!info) {
    return {
      statusCode: 400,
      body: "Could not determine the user's name."
    };
  }
  const { name, email } = info;

  const sheet = await getSheet();
  const data = getTasks(sheet, name, email);

  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
};

export { handler };

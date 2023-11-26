
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { JWT } from "google-auth-library";
import { google, sheets_v4 } from 'googleapis';
import type { TaskData } from "../../src/components/Task";
import { ErrorMessages } from "../../src/shared/errors";


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
    throw new Error(ErrorMessages.SpreadSheetNotLoaded);
  }

  for (const valueRange of sheet.valueRanges) {
    const values = valueRange.values;

    if (!values) {
      throw new Error(ErrorMessages.SpreadSheetNotLoaded);
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

    let col = 10;
    while (true) {
      const name = values[3][col];
      const completed = values[row][col];

      if (name != "" && name != currentTask.name) {
        currentTask = {
          name,
          completed: 0,
          required: 0,
        };
        tasks.push(currentTask);
      }

      
      if (completed == "TRUE") {
        currentTask.completed += 1;
        currentTask.required += 1;
      } else if (completed == "FALSE") {
        currentTask.required += 1;
      } else {
        // The first time we get to a spot where they don't have anything, that should be the last task.
        break;
      }

      col++;
    }

    return tasks;
  }

  throw new Error(ErrorMessages.NotInSpreadSheet);
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
  console.log("Handling");
  if (!event.queryStringParameters) {
    return {
      statusCode: 400,
      body: ErrorMessages.NoQueryString,
    };
  }

  const { access_token } = event.queryStringParameters;

  if (!access_token) {
    return {
      statusCode: 400,
      body: ErrorMessages.NoAccessToken,
    };
  } 

  const info = await getInfo(access_token);

  if (!info) {
    return {
      statusCode: 400,
      body: ErrorMessages.NoName,
    };
  }
  const { name, email } = info;

  const sheet = await getSheet();
  const data = getTasks(sheet, name, email);

  console.log("Returning", data)

  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
};

export { handler };

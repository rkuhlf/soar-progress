
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { JWT } from "google-auth-library";
import { google, sheets_v4 } from 'googleapis';
import type { TaskData } from "../../src/components/Task";
import { ErrorMessages } from "../../src/shared/errors";


const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const SHEET_ID = "10Lf_jVmGdzkVC8Ed-XevhlWIJ_lAAyAUa6g3m6iIAbQ";
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
  console.log(res.data);
  
  return res.data;
}

function nameMatches(name: string, firstName: string, lastName: string): boolean {
  lastName = lastName.trim();
  firstName = firstName.trim();

  return `${firstName} ${lastName}` == name || `${lastName} ${firstName}` == name;
}

const startColumnLookup = {
  "Pilot Your Potential": 10,
  "Elevate Your Expectations": 10,
  "Look To Launch": 10,
  "Take Flight": 10,
  "Increase Your Altitude 1": 10,
  "Increase Your Altitude 2": 10,
}

const endColumnLookup = {
  "Pilot Your Potential": 18,
  "Elevate Your Expectations": 19,
  "Look To Launch": 17,
  "Take Flight": 18,
  "Increase Your Altitude 1": 16,
  "Increase Your Altitude 2": 16,
}

function getTasks(sheet: sheets_v4.Schema$BatchGetValuesResponse, name: string, email: string): TaskData[] {
  if (!sheet.valueRanges) {
    throw new Error(ErrorMessages.SpreadSheetNotLoaded);
  }

  for (const valueRange of sheet.valueRanges) {
    let startColumn = -1;
    let endColumn = -1;

    for (const sheetName in startColumnLookup) {
      if (valueRange.range?.includes(sheetName)) {
        startColumn = startColumnLookup[sheetName];
        endColumn = endColumnLookup[sheetName];
      }
    }

    if (startColumn == -1 || endColumn == -1) {
      throw new Error("Couldn't figure out what the sheet was.")
    }
    
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

    for (let col = startColumn; col <= endColumn; col++) {
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
      }
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

  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
};

export { handler };

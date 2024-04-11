
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
  
  return res.data;
}

function hasParenthetical(str: string) {
  return str.includes("(") && str.includes(")");
}

function splitParenthetical(str: string) {
  const start = str.indexOf("(");
  const end = str.indexOf(")");
  const first = str.substring(0, start);
  const second = str.substring(start + 1, end);



  return [first, second];
}

function nameMatches(targetName: string, firstName: string, lastName: string): boolean {
  if (!firstName || !lastName || !targetName) {
    return false;
  }
  
  if (hasParenthetical(lastName)) {
    const [first, second] = splitParenthetical(lastName);
    return nameMatches(targetName, firstName, first) || nameMatches(targetName, firstName, second);
  }

  if (hasParenthetical(firstName)) {
    const [first, second] = splitParenthetical(firstName);
    return nameMatches(targetName, first, lastName) || nameMatches(targetName, second, lastName);
  }

  if (hasParenthetical(targetName)) {
    const [first, second] = splitParenthetical(targetName);
    return nameMatches(first, firstName, lastName) || nameMatches(second, firstName, lastName);
  }

  targetName = targetName.trim();
  lastName = lastName.trim();
  firstName = firstName.trim();
  
  return `${firstName} ${lastName}` == targetName || `${lastName} ${firstName}` == targetName;
}

const startColumnLookupFirstSemester = {
  "Pilot Your Potential": 10,
  "Elevate Your Expectations": 10,
  "Look To Launch": 10,
  "Take Flight": 10,
  "Increase Your Altitude 1": 10,
  "Increase Your Altitude 2": 10,
}

const endColumnLookupFirstSemester = {
  "Pilot Your Potential": 18,
  "Elevate Your Expectations": 19,
  "Look To Launch": 17,
  "Take Flight": 18,
  "Increase Your Altitude 1": 16,
  "Increase Your Altitude 2": 16,
}

const startColumnLookupSecondSemester = {
  "Pilot Your Potential": 25,
  "Elevate Your Expectations": 26,
  "Look To Launch": 24,
  "Take Flight": 24,
  "Increase Your Altitude 1": 23,
  "Increase Your Altitude 2": 23,
}

// End column should be inclusive.
const endColumnLookupSecondSemester = {
  "Pilot Your Potential": 32,
  "Elevate Your Expectations": 33,
  "Look To Launch": 32,
  "Take Flight": 32,
  "Increase Your Altitude 1": 30,
  "Increase Your Altitude 2": 30,
}

const nameLookupSecondSemester = {
  "Pilot Your Potential": 21,
  "Elevate Your Expectations": 22,
  "Look To Launch": 20,
  "Take Flight": 20,
  "Increase Your Altitude 1": 19,
  "Increase Your Altitude 2": 19,
}

const nameEquivalenceClasses = [
  new Set(["Ben", "Benjamin"]),
  new Set(["Izzy", "Isabel", "Isabella"]),
];

/**
 * 
 * @param sheet 
 * @param name The name that Google has for this person.
 * @param email 
 * @returns 
 */
function getTasks(sheet: sheets_v4.Schema$BatchGetValuesResponse, name: string, email: string): TaskData[] {  
  if (!sheet.valueRanges) {
    throw new Error(ErrorMessages.SpreadSheetNotLoaded);
  }

  for (const valueRange of sheet.valueRanges) {
    let startColumn = -1;
    let endColumn = -1;

    let lastNameIndex;
    for (const sheetName in startColumnLookupSecondSemester) {
      if (valueRange.range?.includes(sheetName)) {
        startColumn = startColumnLookupSecondSemester[sheetName];
        endColumn = endColumnLookupSecondSemester[sheetName];
        lastNameIndex = nameLookupSecondSemester[sheetName];
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
    let emptyRowCount = 0;
    for (let i = 4; i < values.length; i++) {
      let lastName: string = values[i][lastNameIndex];
      let firstName: string = values[i][lastNameIndex + 1];
      let nickname: string = values[i][lastNameIndex + 2];
      let rowEmail: string = values[i][lastNameIndex + 3];

      // We keep track of how many empty rows in a row; more than ten and we've reached the end.
      if (!lastName || !firstName) {
        emptyRowCount ++;
        if (emptyRowCount >= 10) {
          break;
        }
        continue;
      } else {
        emptyRowCount = 0;
      }

      // Iterate through all of the possible variations of the name found in the sheet.
      const possibleCombos = [
        [name, firstName, lastName],
        [name, nickname, lastName],
      ];

      for (const names of nameEquivalenceClasses) {
        if (names.has(firstName)) {
          for (const alternativeName of names) {
            possibleCombos.push([name, alternativeName, lastName]);
          }
        }
      }
      let foundMatch = false;

      for (const combo of possibleCombos) {
        if (nameMatches(combo[0], combo[1], combo[2])) {
          row = i;
          foundMatch = true;
          break;
        }
      }

      if (!foundMatch && rowEmail.trim() == email) {
        row = i;
        foundMatch = true;
      }

      if (foundMatch) {
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

      // If the name is empty or undefined, we should assume it goes with the previous one, so not this.
      if (name && name != currentTask.name) {
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

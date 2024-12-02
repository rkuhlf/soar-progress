
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { JWT } from "google-auth-library";
import { google, sheets_v4 } from 'googleapis';
import type { TaskData } from "../../src/components/Task";
import { ErrorMessages } from "../../src/shared/errors";
import { start } from "repl";


const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const SHEET_ID = "1f5O1H-XR6goR3GSy-CYepBoQpsup4o8skqChsYR0V3E";
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

  const sheets = google.sheets({ version: 'v4', auth: client });
  // The specific range has to be specified for IYA1 and IYA2 because otherwise it will assume that we are picking column IYA1 for Pilot your Potential for some reason.
  const res = await sheets.spreadsheets.values.batchGet({
    ranges: ["Pilot Your Potential", "Elevate Your Expectations", "Look to Launch", "Take Flight", "IYA1!A1:AP100", "IYA2!A1:AP100"],
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

// Some are set to 11 to skip the hidden column for Launch Pad Training, which is no longer being required.
const startColumnLookupFirstSemester = {
  "Pilot Your Potential": 10,
  "Elevate Your Expectations": 10,
  "Look To Launch": 10,
  "Take Flight": 11,
  "IYA1": 11,
  "IYA2": 10,
}

// Currently set to skip the ACH stuff.
const endColumnLookupFirstSemester = {
  "Pilot Your Potential": 17,
  "Elevate Your Expectations": 18,
  "Look To Launch": 16,
  "Take Flight": 17,
  "IYA1": 16,
  "IYA2": 16,
}

const startColumnLookupSecondSemester = {
  "Pilot Your Potential": 25,
  "Elevate Your Expectations": 26,
  "Look To Launch": 24,
  "Take Flight": 24,
  "IYA1": 23,
  "IYA2": 23,
}

// End column should be inclusive.
const endColumnLookupSecondSemester = {
  "Pilot Your Potential": 32,
  "Elevate Your Expectations": 33,
  "Look To Launch": 32,
  "Take Flight": 32,
  "IYA1": 30,
  "IYA2": 30,
}

const nameLookupFirstSemester = {
  "Pilot Your Potential": 1,
  "Elevate Your Expectations": 1,
  "Look To Launch": 1,
  "Take Flight": 1,
  "IYA1": 1,
  "IYA2": 1,
}

const headerRowLookup = {
  "Pilot Your Potential": 2,
  "Elevate Your Expectations": 3,
  "Look To Launch": 3,
  "Take Flight": 3,
  "IYA1": 3,
  "IYA2": 3,
}

const nameEquivalenceClasses = [
  new Set(["Ben", "Benjamin"]),
  new Set(["Izzy", "Isabel", "Isabella"]),
  new Set(["Will", "William"]),
  // Interesting nickname - Juan here is pronounced you-on; this guy is from South Africa.
  new Set(["Juan", "Johannes"]),
  new Set(["Porras", "Porras Jr."]),
  new Set(["Fer", "Fernanda"]),
  new Set(["Allie", "Alexandra"]),
];

function findUserRow(values: string[][], indices: Indices, targetName: string, targetEmail: string): number | null {
  let emptyRowCount = 0;

  // Iterate through the columns.
  for (let row = 4; row < values.length; row++) {
    let lastName: string = values[row][indices.lastNameColumn];
    let firstName: string = values[row][indices.firstNameColumn];
    let nickname: string = indices.nicknameColumn ? values[row][indices.nicknameColumn] : "";

    // We keep track of how many empty rows in a row; more than ten and we've reached the end.
    if (!lastName || !firstName) {
      emptyRowCount++;
      if (emptyRowCount >= 10) {
        return null;
      }
      continue;
    } else {
      emptyRowCount = 0;
    }

    firstName = firstName.trim();
    lastName = lastName.trim();

    // Iterate through all of the possible variations of the name found in the sheet.
    const possibleCombos: string[][] = [[firstName, lastName], [nickname, lastName]];

    for (const names of nameEquivalenceClasses) {
      if (names.has(firstName)) {
        for (const alternativeName of names) {
          possibleCombos.push([alternativeName, lastName]);
        }
      }

      if (names.has(lastName)) {
        for (const alternativeName of names) {
          possibleCombos.push([firstName, alternativeName]);
        }
      }
    }

    let foundMatch = false;
    for (const combo of possibleCombos) {
      if (nameMatches(targetName, combo[0], combo[1])) {
        return row;
      }
    }

    // If we couldn't match on the name, maybe we can still match on the email.
    let rowEmail: string = values[row][indices.emailColumn];
    if (!foundMatch && rowEmail && rowEmail.trim() == targetEmail) {
      return row;
    }
  }

  return null;
}


function parseTasks(values: string[][], row: number, headerRow: number, startColumn: number, endColumn: number): TaskData[] {
  // Iterate over all of the tasks that are on the list.
  const tasks: TaskData[] = [];

  let currentTask = {
    name: "",
    completed: 0,
    required: 0,
  }

  for (let col = startColumn; col <= endColumn; col++) {
    const name = values[headerRow][col];
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


type Indices = {
  taskStartColumn: number,
  taskEndColumn: number,
  firstNameColumn: number,
  nicknameColumn?: number,
  lastNameColumn: number,
  emailColumn: number,
  headerRow: number
};

// TODO: Change this to look through and see which column is the one with the email.
function getIndicesForSheet(sheet: sheets_v4.Schema$ValueRange): Indices | null {
  for (const sheetName in startColumnLookupFirstSemester) {
    if (sheet.range?.includes(sheetName)) {
      const values = sheet.values;
      if (!values) {
        throw new Error(ErrorMessages.SpreadSheetNotLoaded);
      }
  
      const headerRow = headerRowLookup[sheetName];

      let emailColumn;
      let nicknameColumn

      let emptyCells = 0;
      // Look through the columns to see which have the right labels.
      for (let column = 0; emptyCells < 10 && column < values[headerRow].length; column++) {
        // If it's empty, we make note of that then skip to the next cell.
        if (!values[headerRow][column]) {
          emptyCells++;
          continue;
        } else {
          emptyCells = 0;
        }

        if (values[headerRow][column].trim().toLowerCase() == "email") {
          emailColumn = column;
        }

        if (values[headerRow][column].trim().toLowerCase() == "preferred name") {
          nicknameColumn = column;
        }
      }

      if (!emailColumn) {
        console.info("No email column so returning null.");
        return null;
      }

      return {
        taskStartColumn: startColumnLookupFirstSemester[sheetName],
        taskEndColumn: endColumnLookupFirstSemester[sheetName],
        lastNameColumn: nameLookupFirstSemester[sheetName],
        emailColumn,
        firstNameColumn: nameLookupFirstSemester[sheetName] + 1,
        nicknameColumn,
        headerRow,
      }
    }
  }

  return null;
}

/**
 * 
 * @param spreadsheet 
 * @param name The name that Google has for this person.
 * @param email 
 * @returns 
 */
function getTasks(spreadsheet: sheets_v4.Schema$BatchGetValuesResponse, name: string, email: string): TaskData[] {
  if (!spreadsheet.valueRanges) {
    throw new Error(ErrorMessages.SpreadSheetNotLoaded);
  }

  // Loop through the sheets of this spreadsheet.
  for (const sheet of spreadsheet.valueRanges) {

    const indices = getIndicesForSheet(sheet);
    if (indices == null) {
      // We expect this never to happen because we only queried for the sheets that we know about, and no additional sheets.
      throw new Error("Couldn't figure out what the sheet was.")
    }
    
    const values = sheet.values;
    if (!values) {
      throw new Error(ErrorMessages.SpreadSheetNotLoaded);
    }

    const row = findUserRow(values, indices, name, email);

    // We didn't find them in this one.
    if (row == null) {
      continue;
    }

    return parseTasks(values, row, indices.headerRow, indices.taskStartColumn, indices.taskEndColumn);
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
    .then((data: any): { name: string, email: string } => {
      return { name: data.name, email: data.email };
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

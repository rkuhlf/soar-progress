
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { JWT } from "google-auth-library";
import { google, sheets_v4 } from 'googleapis';
import type { TaskData } from "../../src/components/Task";
import { ErrorMessages } from "../../src/shared/errors";
import { start } from "repl";


const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const SHEET_ID = "1wmBYYc2s6NFeIJZIScO6k_6X0W3LMSseECwwpKHNZ2w";
const GOOGLE_SHEET_KEY = process.env.GOOGLE_SHEET_KEY?.split(String.raw`\n`).join('\n');
// In addition to updating this, you have to update all of the indices where the columns are, e.g. startColumnLookup.
const IS_SPRING = true;

if (!GOOGLE_SHEET_KEY) {
  throw Error("Could not determine google sheet key.");
}

async function loadSpreadSheet(): Promise<sheets_v4.Schema$BatchGetValuesResponse> {
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

const startColumnLookup = {
// startColumn lookup for first semester.
  // "Pilot Your Potential": 5,
  // "Elevate Your Expectations": 5,
  // "Look To Launch": 5,
  // "Take Flight": 5, // f
  // "IYA1": 5,
  // "IYA2": 5,

  // startColumn lookup for second semester.
  "Pilot Your Potential": 19, // t
  "Elevate Your Expectations": 20,
  "Look To Launch": 18,
  "Take Flight": 18,
  "IYA1": 17,
  "IYA2": 17,
}

// Currently set to skip the ACH stuff.
// End column should be inclusive.
const endColumnLookup = {
  // End column lookup for the first semester.
  // "Pilot Your Potential": 13,
  // "Elevate Your Expectations": 14,
  // "Look To Launch": 12,
  // "Take Flight": 12, // m
  // "IYA1": 11,
  // "IYA2": 11,
  // End column lookup for the second semester.
  "Pilot Your Potential": 26, // AA
  "Elevate Your Expectations": 27,
  "Look To Launch": 26,
  "Take Flight": 26, // m
  "IYA1": 23,
  "IYA2": 23,
}

const nameLookup = {
  // First semester numbers
  // "Pilot Your Potential": 1,
  // "Elevate Your Expectations": 1,
  // "Look To Launch": 1,
  // "Take Flight": 1,
  // "IYA1": 1,
  // "IYA2": 1,
  // Second semester numbers
  "Pilot Your Potential": 16, // q
  "Elevate Your Expectations": 17,
  "Look To Launch": 15,
  "Take Flight": 15,
  "IYA1": 14,
  "IYA2": 14,
}

// These don't need to be changed each semester.
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
  for (let row = 3; row < values.length; row++) {
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

function getIndicesForSheet(sheet: sheets_v4.Schema$ValueRange, spring: boolean): Indices | null {
  for (const sheetName in startColumnLookup) {
    if (sheet.range?.includes(sheetName)) {
      const values = sheet.values;
      if (!values) {
        throw new Error(ErrorMessages.SpreadSheetNotLoaded);
      }

      const headerRow = headerRowLookup[sheetName];

      let seenEmail = false;
      let seenNickname = false;
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
          if (spring) { // If it's the spring, we need to take the second email column.
            if (!seenEmail) {
              seenEmail = true;
            } else {
              emailColumn = column;
            }
          } else { // If it's the fall and we've seen the email column, just ignore it.
            if (!seenEmail) {
              seenEmail = true;
              emailColumn = column;
            }
          }
        }

        if (values[headerRow][column].trim().toLowerCase() == "preferred name") {
          if (spring && !seenNickname) {
            seenNickname = true;
          } else {
            nicknameColumn = column;
          }
        }
      }

      if (!emailColumn) {
        console.info("No email column so returning null.", {
          sheetName,
          emailColumn,
        });
        return null;
      }

      return {
        taskStartColumn: startColumnLookup[sheetName],
        taskEndColumn: endColumnLookup[sheetName],
        lastNameColumn: nameLookup[sheetName],
        emailColumn,
        // Assume the first name is the next column after the last name.
        firstNameColumn: nameLookup[sheetName] + 1,
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
 * @returns The sheet of the spreadsheet that the person was found in.
 */
function getSheet(spreadsheet: sheets_v4.Schema$BatchGetValuesResponse, name: string, email: string): sheets_v4.Schema$ValueRange {
  if (!spreadsheet.valueRanges) {
    throw new Error(ErrorMessages.SpreadSheetNotLoaded);
  }

  // Loop through the sheets of this spreadsheet.
  for (const sheet of spreadsheet.valueRanges) {
    const indices = getIndicesForSheet(sheet, IS_SPRING);
    if (indices == null) {
      // We expect this never to happen because we only queried for the sheets that we know about, and no additional sheets.
      throw new Error("Couldn't figure out what the sheet was.")
    }

    const values = sheet.values;
    if (!values) {
      throw new Error(ErrorMessages.SpreadSheetNotLoaded);
    }

    const row = findUserRow(values, indices, name, email);

    // We found them!.
    if (row != null) {
      return sheet;
    }
  }

  throw new Error(ErrorMessages.NotInSpreadSheet);
}

function getTasks(sheet: sheets_v4.Schema$ValueRange, name: string, email: string): TaskData[] {
  const indices = getIndicesForSheet(sheet, IS_SPRING);
  if (indices == null) {
    // We expect this never to happen because we only queried for the sheets that we know about, and no additional sheets.
    throw new Error("Couldn't figure out what the sheet was.")
  }

  const values = sheet.values;
  if (!values) {
    throw new Error(ErrorMessages.SpreadSheetNotLoaded);
  }

  const row = findUserRow(values, indices, name, email);

  // We found them!.
  if (row != null) {
    return parseTasks(values, row, indices.headerRow, indices.taskStartColumn, indices.taskEndColumn);
  }

  throw new Error(ErrorMessages.NotInSpreadSheet);
}

function trimCharacter(str: string, char: string) {
  const escapedChar = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special regex characters
  const regex = new RegExp(`^${escapedChar}+|${escapedChar}+$`, 'g');
  return str.replace(regex, '');
}

function getSheetName(sheet: sheets_v4.Schema$ValueRange) {
  if (!sheet.range) {
    throw new Error("Sheet range was not string");
  }

  const exclamationMark = sheet.range.indexOf("!");
  if (exclamationMark == -1) {
    return sheet.range;
  }

  const name = sheet.range.substring(0, exclamationMark)
  return trimCharacter(name, "'");
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
  
  const spreadsheet = await loadSpreadSheet();
  const sheet = getSheet(spreadsheet, name, email);
  const data = {
    year: getSheetName(sheet),
    tasks: getTasks(sheet, name, email),
  } 

  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
};

export { handler };



import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { GoogleAuth } from "google-auth-library";
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];


const API_KEY = "AIzaSyB4r9lmbYmWPFvUaC1h1FlnDzgNi5B0igs"
const SHEET_ID = "1SzjlzhnZKmlzCrzb2lx8CE9cUwITn-sT6xZojdFPDv8";

async function getTestSheet() {
  console.log("Running get test sheet.")
  
  const auth = new GoogleAuth({
    scopes: SCOPES,
    clientOptions: {
      clientId: "597147782814-6psc7ma2iag4rbkjq84v7dga8hml2bsc.apps.googleusercontent.com",
      clientSecret: "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"
    },
  });
  

  const sheets = google.sheets({version: 'v4', auth});
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Class Data!A1:E',
  });
  
  console.log(res.data);

  return res.data;
}

getTestSheet();


//@ts-ignore
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const data = getTestSheet();
  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
};

export { handler };

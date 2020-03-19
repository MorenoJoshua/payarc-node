import PayArc from "./PayArc";
// @ts-ignore
global.Headers = global.Headers || require('fetch-headers');


require("dotenv").config();

const p = new PayArc({
  secretKey: process.env.SECRET_KEY,
  clientSecret: process.env.CLIENT_SECRET,
  clientId: process.env.CLIENT_ID,
  baseURL: process.env.BASE_URL,
});

console.log(p.customers.list());
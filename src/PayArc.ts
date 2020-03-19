import {Methods} from "./enums";
import Axios from "axios";
import {emailValidation, stringValidation} from "./validations";

type PayArcRequestArgs = { endpoint: string; method: Methods; body?: any | null; limit?: number; page?: number };

// type PayArcRequest = (PayArcRequestArgs) => any;

class PayArc {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly secretKey: string;
  private readonly baseURL: string;

  constructor({clientId, clientSecret, secretKey, baseURL}) {
    if (!clientId || !clientSecret || !secretKey) throw new Error("Missing configuration");
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.secretKey = secretKey;
    this.baseURL = baseURL;
  }

  headers = (method: Methods) => {
    return {
      ...method === Methods.POST || method === Methods.PATCH ? {"Content-Type": "application/x-www-form-urlencoded"} : {},
      "Authorization": `Bearer ${this.secretKey}`,
      "Accept": "application/json",
    };
  };

  request = ({
               endpoint,
               method,
               body,
               limit = 100,
               page = 1,
             }): { headers: { Authorization: string; Accept: string }; method: Methods; body: string; url: string } => ({
    url: `${this.endpoint(endpoint)}/?limit=${limit}&page=${page}`,
    method,
    headers: this.headers(method),
    body: body ? JSON.stringify(body) : '',
  });

  customers = {
    customer: ({name, email, description, send_email_address, cc_email_address, country, address_1, address_2, city, state, zip, phone}) => {
      const errors = [];
      if (!emailValidation(email)) errors.push("email");
      if (!emailValidation(send_email_address)) errors.push("email");
      if (!stringValidation(name, email, send_email_address, country, address_1, country, state, country, zip, phone)) errors.push("empty string");
    },
    list: () => {
      const {url, headers} = this.request({
        endpoint: "customers",
        method: Methods.GET,
        body: null,
      });
      return Axios.get(url, {
        headers
      }).then(r => r.data)
        .catch(console.warn);
    },
    get: (customerId: string) => {
      const {url, headers} = this.request({
        endpoint: `customers/${customerId}`,
        method: Methods.GET,
        body: null,
      });
      return Axios.get(url, {
        headers
      }).then(r => r.data)
        .catch(console.warn);
    },
    create: () => {
    },
    update: () => {
    },
    delete: () => {
    },
  };

  endpoint = (queryString) => `${this.baseURL}/customers`;


}

export default PayArc;
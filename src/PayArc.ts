import {CardSource, Methods} from "./enums";
import Axios from "axios";
import {emailValidation, stringValidation} from "./validations";

type PayArcRequestArgs = { endpoint: string; method: Methods; body?: any | null; limit?: number; page?: number };
type PayArcRequest = ({endpoint, method, body, limit, page}: PayArcRequestArgs) => { headers: { Authorization: string; Accept: string }; method: Methods; body: string; url: string };

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

  request: PayArcRequest = ({
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
    cards: {
      card: ({card_source, card_number, exp_month, exp_year, cvv, card_holder_name, address_line1, address_line2, city, state, zip, country}) => {
        const errors = [];
        if (
          card_source !== CardSource.INTERNET ||
          card_source !== CardSource.MAIL ||
          card_source !== CardSource.MANUAL ||
          card_source !== CardSource.PHONE ||
          card_source !== CardSource.SWIPE
        ) errors.push("wrong source");
        if (card_number.replace(/\D/gi, '').length !== 16) errors.push("card number error");
        if (Number(exp_month) > 12 || Number(exp_month) < 1) errors.push("month error");
        if (Number(exp_year) <= new Date().getFullYear()) errors.push("month error");
        if (new Date(Number(exp_year), Number(exp_month), 0, 0, 0, 0, 0).getTime() <= Date.now()) errors.push("card is expired");
        if (Number(cvv) < 100 || Number(cvv) > 9999) errors.push("cvv not valid");
        if (card_holder_name.lenght < 3) errors.push("name too short");
        if (address_line1.lenght < 3) errors.push("address too short");
        if (city.lenght < 3) errors.push("city too short");
        if (state.lenght < 3) errors.push("state too short");
        if (zip.lenght < 4) errors.push("zip too short");
        if (country.lenght < 3) errors.push("country too short");

        if (errors.length > 0) throw new Error(errors.join("\r\n"));

        return {
          card_source,
          card_number: card_number.replace(/\D/gi, ''),
          exp_month: Number(exp_month),
          exp_year: Number(exp_year),
          card_holder_name,
          address_line1,
          address_line2,
          city,
          state,
          zip,
          country,
        }
      },
      create_step1: (cardData) => { // create
        const {url, headers} = this.request({
          endpoint: 'tokens',
          method: Methods.POST
        });
        const createData = this.customers.cards.card(cardData);
        return Axios.post(url, createData, {
          headers,
          url
        }).then(r => r.data).catch(console.warn);

      },
      create_step2: ({customerId, cardToken}) => { // attach
        const {url, headers} = this.request({
          endpoint: `customers/${customerId}`,
          method: Methods.PATCH,
        });
        return Axios.patch(url, {
          token_id: cardToken
        }, {
          headers
        }).then(r => r.data).catch(console.warn);
      },
      updateDefault: ({customerId, cardToken: cardId}) => { // attach
        const {url, headers} = this.request({
          endpoint: `customers/${customerId}`,
          method: Methods.PATCH,
        });
        return Axios.patch(url, {
          default_card_id: cardId
        }, {
          headers
        }).then(r => r.data).catch(console.warn);
      },
      delete: ({customerId, cardToken: cardId}) => { // attach
        const {url, headers} = this.request({
          endpoint: `customers/${customerId}/cards/${cardId}`,
          method: Methods.DELETE,
        });
        return Axios.delete(url, {
          headers
        }).then(r => r.data).catch(console.warn);
      },
      update: ({cardId, cardData}) => {
        const {url, headers} = this.request({
          endpoint: `cards/${cardId}`,
          method: Methods.PATCH,
        });
        return Axios.patch(url, cardData, {
          headers,
          url
        }).then(r => r.data).catch(console.warn);
      },
    },
    customerDataVerification: ({name, email, description, send_email_address, cc_email_address, country, address_1, address_2, city, state, zip, phone}) => {
      const errors = [];
      if (!emailValidation(email)) errors.push("email");
      if (!emailValidation(send_email_address)) errors.push("email");
      if (!stringValidation(name, email, send_email_address, country, address_1, country, state, country, zip, phone)) errors.push("empty string");
      if (errors.length !== 0) throw new Error("Error somewhere");
      return errors.length === 0
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
    create: (customerData) => {
      if (this.customers.customerDataVerification(customerData)) {
        const {url, headers, body} = this.request({
          endpoint: "customers",
          method: Methods.PATCH,
          body: customerData
        });
        return Axios.post(url, body, {
          headers,
        })
          .then(r => r.data)
          .catch(console.warn);
      }
    },
    update: ({customerId, data}) => {
      const {headers, url} = this.request({
        endpoint: `customers/${customerId}`,
        method: Methods.PATCH,
      });
      return Axios.patch(url, data, {
        headers
      }).then(r => r.data).catch(console.warn);
    },
    delete: (customerId) => {
      const {headers, url} = this.request({
        endpoint: `customers/${customerId}`,
        method: Methods.DELETE
      });
      return Axios.delete(url, {
        headers
      }).catch(console.warn)
    },
  };

  endpoint = (queryString) => `${this.baseURL}/customers`;


}

export default PayArc;
import axios from 'axios'
import { load } from 'cheerio'
import UAParser from 'ua-parser-js'
import { faker } from '@faker-js/faker'
import crypto from 'crypto'
import QRCode from 'qrcode';
import FormData from 'form-data'
/**
 * Generates a QR code from the given text and returns it as a Base64 string.
 *
 * @param {string} text - The text to encode in the QR code.
 * @returns {Promise<string>} - A promise that resolves to the Base64 string of the QR code image.
 */
const generateQRCodeBase64 = async (text) => {
    try {
        const dataUrl = await QRCode.toDataURL(text, { scale: 10 });
        const base64 = dataUrl.split(',')[1];

        return base64;
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw error;
    }
};

/**
 * Parses the User-Agent string and constructs related headers.
 * @param {string} userAgentString - The User-Agent string to parse.
 * @returns {object} - An object containing the constructed headers.
 */
function constructHeaders(userAgentString) {
    const parser = new UAParser();
    parser.setUA(userAgentString);
    const result = parser.getResult();

    const browserName = result.browser.name || 'Unknown';
    const browserVersion = result.browser.major || '0';
    const osName = result.os.name || 'Unknown';

    const secChUa = `"${browserName}";v="${browserVersion}", "Not=A?Brand";v="99", "Chromium";v="99"`;

    const secChUaPlatform = `"${osName}"`;

    const isMobile = result.device.type === 'mobile' ? '?1' : '?0';

    const headers = {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'User-Agent': userAgentString,
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Priority': 'u=0, i',
        'Sec-CH-UA': secChUa,
        'Sec-CH-UA-Mobile': isMobile,
        'Sec-CH-UA-Platform': secChUaPlatform,
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
    };

    return headers;
}


/**
 * Uploads a Base64-encoded file to the specified server.
 *
 * @param {string} base64String - The Base64-encoded string of the file.
 * @param {string} filename - The name of the file, including extension (e.g., 'image.svg').
 * @returns {Promise<string>} - A promise that resolves to the URL of the uploaded file.
 */
async function Uploader(base64String, filename) {
    return new Promise(async (resolve, reject) => {
        try {
            const buffer = Buffer.from(base64String, 'base64');

            const form = new FormData();
            form.append("file", buffer, filename || "none.png");

            const response = await axios.post(
                "https://filezone.my.id/upload",
                form,
                {
                    headers: {
                        ...form.getHeaders(),
                        "sec-ch-ua":
                            '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                        "sec-ch-ua-platform": '"Windows"',
                        Referer: "",
                        "sec-ch-ua-mobile": "?0",
                        "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    },
                }
            );

            if (response.data && response.data.result.url_file) {
                resolve(response.data.result.url_file);
            } else {
                reject(new Error('Upload failed: No file URL returned.'));
            }
        } catch (error) {
            reject(error);
        }
    });
}

export class Trakteer {
    #userAgent;
    #requestHeaders;
    #session;
    CreatorData;
    CSRF_TOKEN;

    constructor() {
        this.#userAgent = faker.internet.userAgent()
        this.#requestHeaders = constructHeaders(this.#userAgent)
        this.#session = axios.create({ headers: this.#requestHeaders })
    }

    /**
     * Get Information about userpage.
     * @param {string} pageUrlOrName - The page name/url to get details with for example "botmaii"
     * @returns {object} - 
     */

    async getData(pageUrlOrName) {
        const getIdFromUrl = url => (url.match(/https:\/\/trakteer\.id\/([^/]+)\/?/) || [])[1] || null;
        let url = getIdFromUrl(pageUrlOrName) ? getIdFromUrl(pageUrlOrName) : "https://trakteer.id/" + pageUrlOrName
        return new Promise(async (resolve, reject) => {
            try {
                const response = await this.#session.get(url)
                if (response.data?.includes("<title>Just a moment...</title>")) reject("Error: (Cf) Please use an asia region IP Address")
                const $ = load(response.data)
                this.CSRF_TOKEN = $("[name=csrf-token]").attr("content")
                this.#session.defaults.headers = { ...this.#session.defaults.headers, cookie: response.headers['set-cookie'].map(cookie => cookie.split(';')[0]).join('; ') }
                this.CreatorData = (await this.#session.get(`https://api.trakteer.id/v2/fe/creator/${$("tr-tip-payment-modal").attr("creator-id")}/summary`)).data.data;
                resolve()
            } catch (e) {
                reject("Error: (GetData) " + String(e))
            }
        })
    }

    /**
     * Send Donation
     * @param {Number} UnitToDonate - Unit to donate, Ex: 2
     * @param {string} Message - Message to send
     * @param {string} Display_name - display name to show
     * @param {string} Email_address - valid email address
     * @returns {object} - An object resp, with error.
     */
    async sendDono(UnitToDonate, Message, Display_name, Email_address) {
        const randomhash = () => crypto.randomBytes(5).toString('hex')
        return new Promise(async (resolve, reject) => {
            let dataToReturn = {}
            if (!this.CSRF_TOKEN || !this.CreatorData) reject("Please use getData Function First")
            UnitToDonate = Number(UnitToDonate)
            if (!UnitToDonate || UnitToDonate < 1) reject("Error: (SendDono) UnitToDonate should be a number and more than 0")
            try {
                const response = await this.#session.post(
                    'https://api.trakteer.id/v2/fe/payment/total',
                    {
                        'price': Number(this.CreatorData.active_unit.data.price),
                        'payment_method': 'qris',
                        'is_payment_fee_by_supporter': true
                    }
                )
                dataToReturn.total_price = response.data.data.total_price
                // console.log({
                //     'form': 'create-tip',
                //     'creator_id': this.CreatorData.id,
                //     'unit_id': this.CreatorData.active_unit.data.id,
                //     'quantity': UnitToDonate,
                //     'Display_name': Display_name || "AutoDono_" + randomhash(),
                //     'support_Message': Message || "",
                //     'times': 'once',
                //     'payment_method': 'qris',
                //     'is_showing_email': 'on',
                //     'is_remember_next': 'on',
                //     'guest_email': /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(Email_address) ? Email_address : `${randomhash()}@${randomhash()}.com`
                // }, { headers: { ...this.#session.defaults.headers.common, "x-requested-with": "XMLHttpRequest", "accept": "application/json", "Content-Type": "application/json", "x-csrf-token": this.CSRF_TOKEN } })
                const { data: rr } = await this.#session.post("https://trakteer.id/pay/xendit/qris", {
                    'form': 'create-tip',
                    'creator_id': this.CreatorData.id,
                    'unit_id': this.CreatorData.active_unit.data.id,
                    'quantity': UnitToDonate,
                    'display_name': Display_name || "AutoDono_" + randomhash(),
                    'support_message': Message || "",
                    'times': 'once',
                    'payment_method': 'qris',
                    "is_anonym": "on",
                    'is_showing_email': 'on',
                    'is_remember_next': 'on',
                    'guest_email': /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(Email_address) ? Email_address : `${randomhash()}@${randomhash()}.com`
                }, { headers: { ...this.#session.defaults.headers, "x-requested-with": "XMLHttpRequest", "accept": "application/json", "content-type": "application/json", "x-csrf-token": this.CSRF_TOKEN } })
                dataToReturn.checkout_url = rr.checkout_url

                const { data: qrisPage } = await this.#session.get(rr.checkout_url)
                const regex = /decodeURI\(['"]([^'"]+)['"]\)/;

                const match = qrisPage.match(regex);
                if (!match) reject("Fail to get QRIS Image Data")
                dataToReturn.qris = await Uploader(await generateQRCodeBase64(decodeURIComponent(match[1])))
                dataToReturn.id = rr.checkout_url.split("qris/")[1]
                resolve(dataToReturn)
            } catch (e) {
                console.error("Error: (Send dono) ", e)
                console.error("Error: (Send dono) ", e.stack);
                reject("Error: (Send dono) " + String(e))
            }
        })
    }
}

// const TR = new Trakteer()

// await TR.getData("botmaiii")
// console.log(await TR.sendDono(1))

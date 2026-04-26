import axios from 'axios';

async function test() {
    try {
        const tokenParams = new URLSearchParams({
            grant_type: 'authorization_code',
            code: 'dummy_code',
            client_id: 'LZbBqEykwlKJelO_p2_En2pf0vYa',
            client_secret: 'NL7NJSoL1OlNNLy4F0gXw0852gga',
            redirect_uri: 'https://wrong-domain.com/callback'
        });

        const tokenResponse = await axios.post('https://gw.ext.prod.api.enedis.fr/oauth2/v3/token', tokenParams.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        console.log("Success:", tokenResponse.data);
    } catch (e) {
        console.log("Error:", e.response?.data || e.message);
    }
}
test();

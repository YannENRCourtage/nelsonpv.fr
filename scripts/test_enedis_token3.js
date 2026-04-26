import axios from 'axios';

async function test() {
    try {
        const clientId = 'LZbBqEykwlKJelO_p2_En2pf0vYa';
        const clientSecret = 'NL7NJSoL1OlNNLy4F0gXw0852gga';
        
        const tokenParams = new URLSearchParams({
            grant_type: 'authorization_code',
            code: 'dummy_code',
            redirect_uri: 'https://www.nelsonpv.fr/api/enedis/callback'
        });

        const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const tokenResponse = await axios.post('https://gw.ext.prod.api.enedis.fr/oauth2/v3/token', tokenParams.toString(), {
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': authHeader
            }
        });
        console.log("Success:", tokenResponse.data);
    } catch (e) {
        console.log("Error:", e.response?.data || e.message);
    }
}
test();

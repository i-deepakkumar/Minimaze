const mazeLayout = ["#######", "#S   E#", "#######"];

// Player ki shuruaati position
const startPosition = { x: 1, y: 1 };

// Renders the maze SVG.
function renderMaze(playerPosition) {
    const mazeWithPlayer = mazeLayout.map((row, y) => {
        if (y === playerPosition.y) {
            return row.substring(0, playerPosition.x) + 'P' + row.substring(playerPosition.x + 1);
        }
        return row;
    });
    return mazeWithPlayer;
}

// Checks if a move is valid.
function isValidMove(x, y) {
    if (y < 0 || y >= mazeLayout.length || x < 0 || x >= mazeLayout[y].length) {
        return false;
    }
    return mazeLayout[y][x] !== '#';
}

// Vercel Serverless Function Handler
export default async function handler(req, res) {
    try {
        let playerPosition = { ...startPosition };
        let buttonIndex = 0;

        if (req.method === 'POST') {
            const body = await req.body;
            buttonIndex = body.untrustedData.buttonIndex;

            // Agar frame ka state hai, to use load karo.
            // "Play Again" click par state nahi hoga, isliye game reset ho jayega.
            if (body.untrustedData.state) {
                 const decodedState = JSON.parse(Buffer.from(body.untrustedData.state, 'base64').toString('ascii'));
                 if (decodedState.x !== undefined && decodedState.y !== undefined) {
                    playerPosition = decodedState;
                 }
            }
        }
        
        // **FIXED**: Movement logic ko saaf aur sahi kiya gaya hai.
        // Yeh block sirf tab chalega jab koi move button (1-4) dabaya gaya ho.
        if (req.method === 'POST' && buttonIndex >= 1 && buttonIndex <= 4) {
            let newPosition = { ...playerPosition };
            if (buttonIndex === 1) newPosition.y -= 1; // Up
            if (buttonIndex === 2) newPosition.y += 1; // Down
            if (buttonIndex === 3) newPosition.x -= 1; // Left
            if (buttonIndex === 4) newPosition.x += 1; // Right

            if (isValidMove(newPosition.x, newPosition.y)) {
                playerPosition = newPosition;
            }
        }

        // **FIXED**: Jeetne ki condition ko sahi variable (playerPosition) se check kiya gaya hai.
        if (mazeLayout[playerPosition.y][playerPosition.x] === 'E') {
            const imageUrl = `https://placehold.co/800x418/28A745/FFFFFF?text=You+Won!`;
            return res.status(200).setHeader('Content-Type', 'text/html').send(`
                <!DOCTYPE html><html><head>
                    <title>You Win!</title>
                    <meta property="fc:frame" content="vNext" /><meta property="fc:frame:image" content="${imageUrl}" />
                    <meta property="og:image" content="${imageUrl}" />
                    <meta property="fc:frame:button:1" content="Play Again" />
                    <meta property="fc:frame:post_url" content="https://minimaze.vercel.app/api/maze" />
                </head></html>`);
        }
        
        const rendered = renderMaze(playerPosition);
        const mazeText = rendered.join('\\n');
        const encodedMazeText = encodeURIComponent(mazeText);
        const imageUrl = `https://placehold.co/800x418/1E293B/FFFFFF?text=${encodedMazeText}&font=monospace`;

        const encodedState = Buffer.from(JSON.stringify(playerPosition)).toString('base64');

        return res.status(200).setHeader('Content-Type', 'text/html').send(`
            <!DOCTYPE html><html><head>
                <title>MiniMaze</title>
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:image" content="${imageUrl}" />
                <meta property="og:image" content="${imageUrl}" />
                <meta property="fc:frame:state" content="${encodedState}" />
                <meta property="fc:frame:button:1" content="⬆️ Up" />
                <meta property="fc:frame:button:2" content="⬇️ Down" />
                <meta property="fc:frame:button:3" content="⬅️ Left" />
                <meta property="fc:frame:button:4" content="➡️ Right" />
                <meta property="fc:frame:post_url" content="https://minimaze.vercel.app/api/maze" />
            </head></html>`);

    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
}

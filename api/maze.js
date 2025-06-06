// Maze layout. '#' is a wall, ' ' is a path, 'S' is start, 'E' is end.
const mazeLayout = [
    "#######",
    "#S    #",
    "# ### #",
    "#   #E#",
    "#######"
];

// Player's starting position
const startPosition = { x: 1, y: 1 };

// Helper function that renders the maze with the player's position.
function renderMaze(playerPosition) {
    const mazeWithPlayer = mazeLayout.map((row, y) => {
        if (y === playerPosition.y) {
            return row.substring(0, playerPosition.x) + 'P' + row.substring(playerPosition.x + 1);
        }
        return row;
    });
    return mazeWithPlayer;
}

// Helper function to check if a move is valid.
function isValidMove(x, y) {
    if (y < 0 || y >= mazeLayout.length || x < 0 || x >= mazeLayout[y].length) {
        return false; // Outside the maze
    }
    return mazeLayout[y][x] !== '#'; // Not a wall
}

// Vercel Serverless Function Handler
export default async function handler(req, res) {
    try {
        let playerPosition = { ...startPosition };
        let buttonIndex = 0;

        // If this came from a button click (POST request)
        if (req.method === 'POST') {
            const body = await req.body;
            buttonIndex = body.untrustedData.buttonIndex;

            // Get the player's current position from the state (base64 encoded)
            if (body.untrustedData.state) {
                 const decodedState = JSON.parse(Buffer.from(body.untrustedData.state, 'base64').toString('ascii'));
                 if (decodedState.x !== undefined && decodedState.y !== undefined) {
                    playerPosition = decodedState;
                 }
            }
        }
        
        // Calculate the new position
        let newPosition = { ...playerPosition };
        if (buttonIndex === 1) newPosition.y -= 1; // Up
        if (buttonIndex === 2) newPosition.y += 1; // Down
        if (buttonIndex === 3) newPosition.x -= 1; // Left
        if (buttonIndex === 4) newPosition.x += 1; // Right

        // If the move is valid, update the position
        if (req.method === 'POST' && isValidMove(newPosition.x, newPosition.y)) {
            playerPosition = newPosition;
        }

        // Check for the win condition
        if (mazeLayout[playerPosition.y][playerPosition.x] === 'E') {
            const imageUrl = `https://placehold.co/800x418/28A745/FFFFFF?text=You+Won!`;
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(`
                <!DOCTYPE html><html><head>
                    <title>You Win!</title>
                    <meta property="fc:frame" content="vNext" />
                    <meta property="fc:frame:image" content="${imageUrl}" />
                    <meta property="og:image" content="${imageUrl}" />
                    <meta property="fc:frame:button:1" content="Play Again" />
                    <meta property="fc:frame:post_url" content="${req.protocol}://${req.headers.host}/api/maze" />
                </head></html>`);
        }
        
        // Generate the new maze image
        const rendered = renderMaze(playerPosition);
        const mazeText = rendered.join('\n');
        // Encode the text for the URL
        const encodedMazeText = encodeURIComponent(mazeText);
        const imageUrl = `https://placehold.co/800x418/1E293B/FFFFFF?text=${encodedMazeText}&font=monospace`;

        // Encode the state for the next move
        const state = Buffer.from(JSON.stringify(playerPosition)).toString('base64');

        // Send the HTML response for the frame
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(`
            <!DOCTYPE html><html><head>
                <title>Farcaster Maze</title>
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:image" content="${imageUrl}" />
                <meta property="og:image" content="${imageUrl}" />
                <meta property="fc:frame:state" content="${state}" />
                <meta property="fc:frame:button:1" content="⬆️ Up" />
                <meta property="fc:frame:button:2" content="⬇️ Down" />
                <meta property="fc:frame:button:3" content="⬅️ Left" />
                <meta property="fc:frame:button:4" content="➡️ Right" />
                <meta property="fc:frame:post_url" content="${req.protocol}://${req.headers.host}/api/maze" />
            </head></html>`);

    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
}

// A bigger and more challenging maze layout.
const mazeLayout = [
    "#############",
    "#S  #       #",
    "# # # ##### #",
    "# #   #     #",
    "# ##### ### #",
    "#     #   #E#",
    "#############"
];

const startPosition = { x: 1, y: 1, moves: 0 };

// **NEW** Helper function to generate an SVG image of the maze.
function generateMazeImageSvg(playerPosition) {
    const cellSize = 50;
    const width = mazeLayout[0].length * cellSize;
    const height = (mazeLayout.length + 1) * cellSize; // Extra space for move counter

    let svgContent = '';

    // Draw maze tiles
    mazeLayout.forEach((row, y) => {
        row.split('').forEach((cell, x) => {
            let color = '#FFFFFF'; // Path
            if (cell === '#') color = '#1E293B'; // Wall
            if (cell === 'S') color = '#10B981'; // Start
            if (cell === 'E') color = '#EF4444'; // End
            svgContent += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${color}" stroke="#334155" stroke-width="1"/>`;
        });
    });

    // Draw player
    svgContent += `<circle cx="${playerPosition.x * cellSize + cellSize / 2}" cy="${playerPosition.y * cellSize + cellSize / 2}" r="${cellSize * 0.3}" fill="#F59E0B"/>`;

    // Draw moves counter
    svgContent += `<text x="${width / 2}" y="${height - cellSize / 2}" font-family="monospace" font-size="30" fill="#1E293B" text-anchor="middle" alignment-baseline="middle">Moves: ${playerPosition.moves}</text>`;
    
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
}

// **NEW** Helper function for the win screen SVG.
function generateWinImageSvg(moves) {
    return `
    <svg width="800" height="418" xmlns="http://www.w3.org/2000/svg">
        <style>
            .title { font-size: 60px; font-weight: bold; fill: #FFFFFF; font-family: sans-serif; }
            .subtitle { font-size: 30px; fill: #FFFFFF; font-family: sans-serif; }
        </style>
        <rect width="100%" height="100%" fill="#28A745"/>
        <text x="50%" y="45%" text-anchor="middle" class="title">You Won!</text>
        <text x="50%" y="60%" text-anchor="middle" class="subtitle">Total Moves: ${moves}</text>
    </svg>`;
}

function isValidMove(x, y) {
    if (y < 0 || y >= mazeLayout.length || x < 0 || x >= mazeLayout[y].length) {
        return false;
    }
    return mazeLayout[y][x] !== '#';
}

export default async function handler(req, res) {
    try {
        let playerPosition = { ...startPosition };
        let buttonIndex = 0;

        if (req.method === 'POST') {
            const body = await req.body;
            buttonIndex = body.untrustedData.buttonIndex;

            if (body.untrustedData.state) {
                 const decodedState = JSON.parse(Buffer.from(body.untrustedData.state, 'base64').toString('ascii'));
                 playerPosition = {
                    x: decodedState.x,
                    y: decodedState.y,
                    moves: decodedState.moves || 0
                 };
            }
        }
        
        if (req.method === 'POST') {
            let newPosition = { ...playerPosition };
            if (buttonIndex === 1) newPosition.y -= 1; // Up
            if (buttonIndex === 2) newPosition.y += 1; // Down
            if (buttonIndex === 3) newPosition.x -= 1; // Left
            if (buttonIndex === 4) newPosition.x += 1; // Right
    
            if (isValidMove(newPosition.x, newPosition.y)) {
                playerPosition = newPosition;
                playerPosition.moves++;
            }
        }

        if (mazeLayout[playerPosition.y][playerPosition.x] === 'E') {
            const svg = generateWinImageSvg(playerPosition.moves);
            const imageUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
            
            return res.status(200).setHeader('Content-Type', 'text/html').send(`
                <!DOCTYPE html><html><head>
                    <title>MiniMaze - You Won!</title>
                    <meta property="fc:frame" content="vNext" />
                    <meta property="fc:frame:image" content="${imageUrl}" />
                    <meta property="og:image" content="${imageUrl}" />
                    <meta property="fc:frame:button:1" content="Play Again" />
                    <meta property="fc:frame:post_url" content="https://minimaze.vercel.app/api/maze" />
                </head></html>`);
        }
        
        const svg = generateMazeImageSvg(playerPosition);
        const imageUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
        const state = Buffer.from(JSON.stringify(playerPosition)).toString('base64');

        return res.status(200).setHeader('Content-Type', 'text/html').send(`
            <!DOCTYPE html><html><head>
                <title>MiniMaze</title>
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:image" content="${imageUrl}" />
                <meta property="og:image" content="${imageUrl}" />
                <meta property="fc:frame:state" content="${state}" />
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

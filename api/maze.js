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

// **UPDATED** Helper function to generate a Farcaster-compliant SVG image.
function generateMazeImageSvg(playerPosition) {
    const cellSize = 50;
    const finalWidth = 800;
    const finalHeight = 418; // 1.91:1 aspect ratio

    // Calculate dimensions of the maze content itself
    const mazeContentWidth = mazeLayout[0].length * cellSize;
    const mazeContentHeight = mazeLayout.length * cellSize;

    // Calculate offsets to center the maze inside the final image dimensions
    const offsetX = (finalWidth - mazeContentWidth) / 2;
    const offsetY = (finalHeight - mazeContentHeight - 60) / 2; // Extra space for title and moves

    let mazeSvgContent = '';
    // Draw maze tiles
    mazeLayout.forEach((row, y) => {
        row.split('').forEach((cell, x) => {
            let color = '#FFFFFF'; // Path
            if (cell === '#') color = '#475569'; // Wall
            if (cell === 'S') color = '#10B981'; // Start
            if (cell === 'E') color = '#EF4444'; // End
            mazeSvgContent += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${color}" stroke="#1E293B" stroke-width="1"/>`;
        });
    });

    // Draw player
    mazeSvgContent += `<circle cx="${playerPosition.x * cellSize + cellSize / 2}" cy="${playerPosition.y * cellSize + cellSize / 2}" r="${cellSize * 0.3}" fill="#F59E0B" stroke="#000000" stroke-width="2"/>`;

    // Construct the final SVG with a background, title, centered maze, and move counter
    return `
    <svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">
        <style>
            .title { font-size: 40px; font-weight: bold; fill: #1E293B; font-family: sans-serif; }
            .moves { font-size: 30px; fill: #1E293B; font-family: sans-serif; }
        </style>
        <rect width="100%" height="100%" fill="#E2E8F0"/>
        <text x="50%" y="45" text-anchor="middle" class="title">MiniMaze</text>
        <g transform="translate(${offsetX}, ${offsetY + 30})">
            ${mazeSvgContent}
        </g>
        <text x="50%" y="${finalHeight - 25}" text-anchor="middle" class="moves">Moves: ${playerPosition.moves}</text>
    </svg>`;
}

// Helper function for the win screen SVG.
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

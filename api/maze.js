const mazeLayout = ["#########", "#S  #   #", "# # # # #", "#   #  E#", "#########"];

// **NEW**: Array of colors for the player.
const playerColors = ['#F59E0B', '#8B5CF6', '#EC4899', '#10B981', '#3B82F6'];

// Function to find the start position 'S' in a layout.
const findStart = (layout) => {
    for(let y = 0; y < layout.length; y++) {
        const x = layout[y].indexOf('S');
        if (x !== -1) return { x, y };
    }
    return { x: 1, y: 1 }; // Fallback
};

// SVG generator for the maze.
function generateMazeImageSvg(playerPosition, playerColor) {
    const cellSize = 50;
    const finalWidth = 800;
    const finalHeight = 418;

    const mazeContentWidth = mazeLayout[0].length * cellSize;
    const mazeContentHeight = mazeLayout.length * cellSize;

    const offsetX = (finalWidth - mazeContentWidth) / 2;
    const offsetY = (finalHeight - mazeContentHeight - 70) / 2;

    let mazeSvgContent = '';
    mazeLayout.forEach((row, y) => {
        row.split('').forEach((cell, x) => {
            let color = '#FFFFFF';
            if (cell === '#') color = '#475569';
            if (cell === 'S') color = '#10B981';
            if (cell === 'E') color = '#EF4444';
            mazeSvgContent += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${color}" stroke="#1E293B" stroke-width="1"/>`;
        });
    });
    
    // Use the dynamic player color.
    mazeSvgContent += `<circle cx="${playerPosition.x * cellSize + cellSize / 2}" cy="${playerPosition.y * cellSize + cellSize / 2}" r="${cellSize * 0.3}" fill="${playerColor}" stroke="#000000" stroke-width="2"/>`;

    return `
    <svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">
        <style>
            .title { font-size: 32px; font-weight: bold; fill: #1E293B; font-family: sans-serif; }
            .moves { font-size: 28px; fill: #1E293B; font-family: sans-serif; }
        </style>
        <rect width="100%" height="100%" fill="#E2E8F0"/>
        <text x="50%" y="40" text-anchor="middle" class="title">MiniMaze</text>
        <g transform="translate(${offsetX}, ${offsetY + 40})">
            ${mazeSvgContent}
        </g>
        <text x="50%" y="${finalHeight - 25}" text-anchor="middle" class="moves">Moves: ${playerPosition.moves}</text>
    </svg>`;
}

// SVG generator for the win screen.
function generateEndScreenSvg(title, subtitle, bgColor) {
    return `
    <svg width="800" height="418" xmlns="http://www.w3.org/2000/svg">
        <style> .title { font-size: 60px; font-weight: bold; fill: #FFFFFF; font-family: sans-serif; } .subtitle { font-size: 30px; fill: #FFFFFF; font-family: sans-serif; } </style>
        <rect width="100%" height="100%" fill="${bgColor}"/>
        <text x="50%" y="45%" text-anchor="middle" class="title">${title}</text>
        <text x="50%" y="60%" text-anchor="middle" class="subtitle">${subtitle}</text>
    </svg>`;
}

function isValidMove(x, y) {
    if (y < 0 || y >= mazeLayout.length || x < 0 || x >= mazeLayout[y].length) return false;
    return mazeLayout[y][x] !== '#';
}

export default async function handler(req, res) {
    try {
        const startPos = findStart(mazeLayout);
        // The game state now tracks position, moves, and color.
        let state = { x: startPos.x, y: startPos.y, moves: 0, colorIndex: 0 };
        
        let buttonIndex = 0;
        if (req.method === 'POST') {
            const body = await req.body;
            buttonIndex = body.untrustedData.buttonIndex;

            // Load state from previous frame if it exists.
            if (body.untrustedData.state) {
                const decodedState = JSON.parse(Buffer.from(body.untrustedData.state, 'base64').toString('ascii'));
                state = { ...state, ...decodedState };
            }
        }
        
        // Handle player movement.
        if (req.method === 'POST' && buttonIndex > 0) {
            let newPosition = { x: state.x, y: state.y };
            if (buttonIndex === 1) newPosition.y -= 1; // Up
            if (buttonIndex === 2) newPosition.y += 1; // Down
            if (buttonIndex === 3) newPosition.x -= 1; // Left
            if (buttonIndex === 4) newPosition.x += 1; // Right
    
            if (isValidMove(newPosition.x, newPosition.y)) {
                state.x = newPosition.x;
                state.y = newPosition.y;
                state.moves++;
                // Change color on every valid move.
                state.colorIndex = (state.colorIndex + 1) % playerColors.length;
            }
        }

        // Check for win condition.
        if (mazeLayout[state.y][state.x] === 'E') {
            const svg = generateEndScreenSvg("You Won!", `Total Moves: ${state.moves}`, "#28A745");
            const imageUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
            
            // **UPDATED**: Win screen now has promotion button.
            return res.status(200).setHeader('Content-Type', 'text/html').send(`
                <!DOCTYPE html><html><head>
                    <title>MiniMaze - You Won!</title>
                    <meta property="fc:frame" content="vNext" />
                    <meta property="fc:frame:image" content="${imageUrl}" />
                    <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
                    <meta property="og:image" content="${imageUrl}" />
                    <meta property="fc:frame:post_url" content="https://minimaze.vercel.app/api/maze" />
                    <meta property="fc:frame:button:1" content="Play Again" />
                    <meta property="fc:frame:button:2" content="Follow @ssr20.eth" />
                    <meta property="fc:frame:button:2:action" content="link" />
                    <meta property="fc:frame:button:2:target" content="https://warpcast.com/ssr20.eth" />
                </head></html>`);
        }
        
        // Render the current game state.
        const playerColor = playerColors[state.colorIndex];
        const svg = generateMazeImageSvg(state, playerColor);
        const imageUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
        const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');

        return res.status(200).setHeader('Content-Type', 'text/html').send(`
            <!DOCTYPE html><html><head>
                <title>MiniMaze</title>
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:image" content="${imageUrl}" />
                <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
                <meta property="og:image" content="${imageUrl}" />
                <meta property="fc:frame:state" content="${encodedState}" />
                <meta property="fc:frame:button:1" content="⬆️ Up" />
                <meta property="fc:frame:button:2" content="⬇️ Down" />
                <meta property="fc:frame:button:3" content="⬅️ Left" />
                <meta property="fc:frame:button:4" content="➡️ Right" />
                <meta property="fc:frame:post_url" content="https://minimaze.vercel.app/api/maze" />
            </head></html>`);

    } catch (error) {
        console.error('Error in handler:', error);
        res.status(500).send('Server Error');
    }
}

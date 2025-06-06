const mazeLayout = ["#############", "#S# #   #   #", "# # # ### ###", "#   #   #   #", "##### ### # #", "#     #   #E#", "#############"];

const playerColors = ['#F59E0B', '#8B5CF6', '#EC4899', '#10B981', '#3B82F6'];

const findStart = (layout) => {
    for(let y = 0; y < layout.length; y++) {
        const x = layout[y].indexOf('S');
        if (x !== -1) return { x, y };
    }
    return { x: 1, y: 1 }; 
};

// **UPDATED** SVG generator now includes a timer.
function generateMazeImageSvg(playerPosition, timeLeft, playerColor) {
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
    
    mazeSvgContent += `<circle cx="${playerPosition.x * cellSize + cellSize / 2}" cy="${playerPosition.y * cellSize + cellSize / 2}" r="${cellSize * 0.3}" fill="${playerColor}" stroke="#000000" stroke-width="2"/>`;

    // Display remaining time
    const timerColor = timeLeft <= 10 ? '#EF4444' : '#1E293B'; // Timer turns red when 10s are left
    return `
    <svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">
        <style>
            .title { font-size: 32px; font-weight: bold; fill: #1E293B; font-family: sans-serif; }
            .timer { font-size: 32px; font-weight: bold; fill: ${timerColor}; font-family: sans-serif; }
        </style>
        <rect width="100%" height="100%" fill="#E2E8F0"/>
        <text x="50%" y="40" text-anchor="middle" class="title">MiniMaze Challenge</text>
        <g transform="translate(${offsetX}, ${offsetY + 40})">
            ${mazeSvgContent}
        </g>
        <text x="50%" y="${finalHeight - 25}" text-anchor="middle" class="timer">Time Left: ${timeLeft}s</text>
    </svg>`;
}

// **UPDATED** Generic end screen for Win/Game Over.
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
    const GAME_DURATION = 30; // 30 seconds

    try {
        const startPos = findStart(mazeLayout);
        let state = { x: startPos.x, y: startPos.y, colorIndex: 0, startTime: Date.now() };
        
        let buttonIndex = 0;
        let isFirstMove = true;

        if (req.method === 'POST') {
            const body = await req.body;
            buttonIndex = body.untrustedData.buttonIndex;

            if (body.untrustedData.state) {
                isFirstMove = false;
                const decodedState = JSON.parse(Buffer.from(body.untrustedData.state, 'base64').toString('ascii'));
                state = { ...state, ...decodedState };
            }
        }

        // If it's a "Play Again" click, reset the state.
        if(buttonIndex > 0 && isFirstMove) {
             state.startTime = Date.now();
        }
        
        const elapsedTime = Math.floor((Date.now() - state.startTime) / 1000);
        const timeLeft = GAME_DURATION - elapsedTime;

        // **NEW** Check for Game Over condition (time ran out).
        if (timeLeft <= 0) {
            const svg = generateEndScreenSvg("Game Over", "Time's up!", "#EF4444");
            const imageUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
            return res.status(200).setHeader('Content-Type', 'text/html').send(`
                <!DOCTYPE html><html><head>
                <title>MiniMaze - Game Over</title>
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:image" content="${imageUrl}" />
                <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
                <meta property="og:image" content="${imageUrl}" />
                <meta property="fc:frame:post_url" content="https://minimaze.vercel.app/api/maze" />
                <meta property="fc:frame:button:1" content="Try Again" />
                <meta property="fc:frame:button:2" content="Follow @ssr20.eth" />
                <meta property="fc:frame:button:2:action" content="link" />
                <meta property="fc:frame:button:2:target" content="https://warpcast.com/ssr20.eth" />
                </head></html>`);
        }
        
        if (req.method === 'POST') {
            let newPosition = { x: state.x, y: state.y };
            if (buttonIndex === 1) newPosition.y -= 1; 
            if (buttonIndex === 2) newPosition.y += 1;
            if (buttonIndex === 3) newPosition.x -= 1;
            if (buttonIndex === 4) newPosition.x += 1;
    
            if (isValidMove(newPosition.x, newPosition.y)) {
                state.x = newPosition.x;
                state.y = newPosition.y;
                state.colorIndex = (state.colorIndex + 1) % playerColors.length;
            }
        }

        // Check for win condition.
        if (mazeLayout[state.y][state.x] === 'E') {
            const timeTaken = elapsedTime;
            const svg = generateEndScreenSvg("You Won!", `Finished in ${timeTaken} seconds!`, "#28A745");
            const imageUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
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
        
        const playerColor = playerColors[state.colorIndex];
        const svg = generateMazeImageSvg(state, timeLeft, playerColor);
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

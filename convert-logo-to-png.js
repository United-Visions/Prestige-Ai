const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function convertLogoToPNG() {
  // Create a standalone HTML file with the logo component
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prestige AI Logo</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, sans-serif;
        }
        .logo-container {
            width: 256px;
            height: 256px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
        }
        .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    
    <script type="text/babel">
        const { Crown } = LucideReact;
        
        const PrestigeLogo = () => {
          const StaticEffect = () => (
            React.createElement('div', {
              className: "absolute inset-0 pointer-events-none opacity-20"
            },
              React.createElement('div', {
                className: "w-full h-full",
                style: {
                  backgroundImage: \`url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E")\`,
                  backgroundSize: "20px 20px"
                }
              })
            )
          );

          const GoldCrown = () => (
            React.createElement('div', {
              className: "absolute top-4 left-1/2 transform -translate-x-1/2"
            },
              React.createElement('div', { className: "relative" },
                React.createElement(Crown, {
                  size: 32,
                  className: "text-yellow-300",
                  fill: "url(#goldGradient)",
                  style: {
                    filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.6))'
                  }
                }),
                React.createElement(Crown, {
                  size: 32,
                  className: "absolute top-0 left-0 text-yellow-600",
                  strokeWidth: 2
                })
              ),
              React.createElement('svg', { width: "0", height: "0" },
                React.createElement('defs', null,
                  React.createElement('linearGradient', {
                    id: "goldGradient",
                    x1: "0%", y1: "0%", x2: "100%", y2: "100%"
                  },
                    React.createElement('stop', {
                      offset: "0%",
                      style: { stopColor: '#FFD700', stopOpacity: 1 }
                    }),
                    React.createElement('stop', {
                      offset: "50%",
                      style: { stopColor: '#FFA500', stopOpacity: 1 }
                    }),
                    React.createElement('stop', {
                      offset: "100%",
                      style: { stopColor: '#DAA520', stopOpacity: 1 }
                    })
                  )
                )
              )
            )
          );

          return React.createElement('div', {
            className: "logo-container"
          },
            React.createElement('div', {
              className: "w-32 h-32 bg-gradient-to-br from-purple-950 to-black rounded-3xl flex items-center justify-center relative shadow-2xl overflow-hidden border border-purple-900/30"
            },
              React.createElement(StaticEffect),
              React.createElement('div', {
                className: "text-white font-sans font-black text-7xl mt-4"
              }, "P"),
              React.createElement(GoldCrown),
              React.createElement('div', {
                className: "absolute top-2 left-2 text-green-400 font-mono text-sm font-bold"
              }, "</>");
              React.createElement('div', {
                className: "absolute bottom-3 right-3 flex space-x-1"
              },
                React.createElement('div', {
                  className: "w-2 h-2 bg-green-400 rounded-full animate-pulse"
                }),
                React.createElement('div', {
                  className: "w-2 h-2 bg-cyan-400 rounded-full animate-pulse",
                  style: { animationDelay: '0.2s' }
                }),
                React.createElement('div', {
                  className: "w-2 h-2 bg-purple-400 rounded-full animate-pulse",
                  style: { animationDelay: '0.4s' }
                })
              )
            )
          );
        };

        ReactDOM.render(React.createElement(PrestigeLogo), document.getElementById('root'));
    </script>
</body>
</html>`;

  // Write the HTML file
  fs.writeFileSync('logo-temp.html', htmlContent);

  try {
    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport to match our logo container
    await page.setViewport({ width: 256, height: 256, deviceScaleFactor: 2 });
    
    // Load the HTML file
    await page.goto('file://' + path.resolve('logo-temp.html'));
    
    // Wait for the component to render
    await page.waitForSelector('.logo-container');
    await page.waitForTimeout(1000); // Give time for animations
    
    // Take screenshot of just the logo container
    const element = await page.$('.logo-container');
    const screenshot = await element.screenshot({
      type: 'png',
      omitBackground: true
    });
    
    // Save the PNG
    fs.writeFileSync('prestige-ai-logo.png', screenshot);
    
    console.log('✅ Logo converted to PNG successfully!');
    console.log('📁 Saved as: prestige-ai-logo.png');
    
    await browser.close();
    
    // Clean up temp file
    fs.unlinkSync('logo-temp.html');
    
  } catch (error) {
    console.error('❌ Error converting logo:', error);
    // Clean up temp file even on error
    if (fs.existsSync('logo-temp.html')) {
      fs.unlinkSync('logo-temp.html');
    }
  }
}

convertLogoToPNG();
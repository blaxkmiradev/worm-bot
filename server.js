require("dotenv").config();
const app = require("./src/app");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🐛 WormBot is alive at http://localhost:${PORT}`);
});

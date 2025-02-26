const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config(); // Cargar variables de entorno
const port = process.env.PORT || 3000

const API_KEY = process.env.API_KEY_COC
const URL_BASE = process.env.URL_BASE

app.use(express.json())

// Configura CORS
app.use(cors());

app.get('/', (req, res) => {
  res.send('Hello World! : ')
})

// api para clash of clans
app.get('/v1/clans/war/:tag', async (req, res) => {
  try {
    const tag = req.params.tag
    const url = URL_BASE + 'clans/%23' + tag + '/currentwar'
    // console.log({ url })
    // console.log({ API_KEY })
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      }
    })
    // console.log(response);

    // if (!response.ok) {
    //   console.log('erroooor:::', response.status);
      
    //   throw new Error(`Error en la API: ${response.status}`)
    // }
    
    const data = await response.json()
    res.json(data)

  } catch (error) {
    res.status(500).json({ error: error.message });
  }

})

app.get('/v1/clans/capital/:tag', async (req, res) => {
  try {
    const tag = req.params.tag
    const url = URL_BASE + 'clans/%23' + tag + '/capitalraidseasons?limit=1'
    // console.log({url});
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      }
    })
    if (!response.ok) {
      throw new Error(`Error en la API: ${response.status}`)
    }
    const data = await response.json()
    res.json(data)
  }catch (error) {
    res.status(500).json({ error: error.message });
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

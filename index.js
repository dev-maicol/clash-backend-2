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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

app.get('/v1/clans/cwl/:tag/:day', async (req, res) => {
  try {
    const tag = req.params.tag
    const day = req.params.day
    // console.log({tag, day});
    const url = URL_BASE + 'clans/%23' + tag + '/currentwar/leaguegroup'
    // console.log({url});

    // 1ra url
    // https://api.clashofclans.com/v1/clans/%23RUG0LC2Q/currentwar/leaguegroup


    // 2da url
    // https://api.clashofclans.com/v1/clanwarleagues/wars/%2389CC2RCP0


    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      }
    })
    if (!response.ok) {
      throw new Error(`Error API Supercell: ${response.status}`)
    }
    const data = await response.json()
    const rounds = await data.rounds[day - 1]['warTags']
    if (rounds[0] == '#0') {
      res.json({ message: 'Day in Clan War League not available' })
    } else {
      // hasta aqui tenemos los 4 warTags del dia seleccionado
      // res.json(rounds)
      let dataResponse
      for (let tagTemp of rounds) {
        // console.log({tagTemp});

        const url2 = URL_BASE + 'clanwarleagues/wars/%23' + tagTemp.slice(1, tagTemp.length)
        // console.log({url2});

        const response2 = await fetch(url2, {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
          }
        })
        if (!response2.ok) {
          throw new Error(`Error API Supercell: ${response.status}`)
        }
        const data2 = await response2.json()
        if (data2['clan']['tag'] == '#' + tag || data2['opponent']['tag'] == '#' + tag) {
          // res.json(data2)
          dataResponse = data2
          break
        }
      }
      // res.json(dataResponse)
      res.json({message:getInformationCWL(dataResponse, tag, day)})
    }
    // res.json({ message: 'Errorrrrrrr no encontramos la urlWar'})
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

function getInformationCWL(data, tag, day){
  // console.log(data['clan']);
  
  const state = data['state'] // inWar, preparation, warEnded
  const teamSize = data['teamSize']

  const preparation = new Date(parseCustomDate(data['preparationStartTime']))
  // console.log(this.parseCustomDate(this.data['preparationStartTime']));
  // console.log(this.data['preparationStartTime']);
  const start = new Date(parseCustomDate(data['startTime']))
  const end = new Date(parseCustomDate(data['endTime']))

  const now = new Date()
  let timeRes = 0
  if (state == 'inWar') {
    timeRes = end.getTime() - now.getTime()
  } else {
    if (state == 'preparation') {
      timeRes = start.getTime() - now.getTime()
    }
  }

  const hours = Math.floor(timeRes / (1000 * 60 * 60)); // Extrae las horas completas
  const minutes = Math.floor((timeRes % (1000 * 60 * 60)) / (1000 * 60)); // Obtiene los minutos restantes

  let clan = []
  if(data['clan']['tag'] == '#' + tag){
    clan = this.data['clan']
  }else{
    if(data['opponent']['tag'] == '#' + tag){
      clan = data['opponent']
    }else{
      clan = ['Errorroroorr']
    }
  }
  // console.log({clan});
  let restante
  if(timeRes == 0){
    restante = 'warEnded'
  }else{
    restante = hours + 'h ' + minutes + 'm'
  }
  
  let respuesta = 
  '*' + clan['name'] + '*\n' + 
  '*Information CWL*' + '\n' +
  '*Day:* ' + day + '\n' + 
  '*State:* ' + state + '\n' + 
  '*Stars:* ' + clan['stars'] + '\n' +
  '*Percentage:* ' + (Math.round(clan['destructionPercentage'] * 100) / 100)  + '%\n' +
  '*Remaining time:* ' + restante + '\n' + 
  '*Attacks:* ' + clan['attacks'] + '/' + teamSize + '\n' +
  '*Remaining attacks:* ' + '\n'

  const members = clan['members']
  for(mem of members){
    if(!mem['attacks']){
      respuesta += mem['name'] + ' (' + mem['townhallLevel'] + ')' + '\n'
    }
  }

  respuesta += '\n' + '```Clash of Clans```\n```Resistencia ♥```'

  return  respuesta
}

function parseCustomDate(dateStr) {
  // Reformatear de 'YYYYMMDDTHHmmss.sssZ' a 'YYYY-MM-DDTHH:mm:ss.sssZ'
  const formattedDate = dateStr.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d{3})Z$/,
    "$1-$2-$3T$4:$5:$6.$7Z"
  );
  return new Date(formattedDate);
}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config(); // Cargar variables de entorno
const port = process.env.PORT || 3000

const API_KEY = process.env.API_KEY_COC
const URL_BASE = process.env.URL_BASE

const URL_BASE_SUPA = process.env.URL_BASE_SUPA
const API_KEY_SUPA = process.env.API_KEY_SUPA

const MAX_CONSULTS = 150

app.use(express.json())

// Configura CORS
app.use(cors());

app.get('/', (req, res) => {
  res.send('Hello World! : ')
})

// api para clash of clans
app.get('/v1/clans/war/:tag', async (req, res) => {
  try {
    // if(verifyConsults())
    // console.log('Consultas: ', await verifyConsults());
    if(await verifyConsults() >= MAX_CONSULTS){
      res.json({ message: 'The limit of daily queries has been reached 😢' })
      return
    }
    
    const tag = req.params.tag
    const url = URL_BASE + 'clans/%23' + tag + '/currentwar'
    // console.log({ url })
    // console.log({ API_KEY })
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      }
    })
    if (!response.ok) {
      throw new Error(`Error API Supercell: ${response.status}`)
    }
    // const data = await response.json()
    // console.log(response);

    // if (!response.ok) {
    //   console.log('erroooor:::', response.status);

    //   throw new Error(`Error en la API: ${response.status}`)
    // }

    const data = await response.json()
    if(data.state == 'notInWar'){
      res.json({ message: 'Clan not in war' })
      return
    }else{
      res.json( { message: getInformationWar(data, tag)})

    }
    // console.log({data});
    

  } catch (error) {
    res.status(500).json({ error: error.message });
  }

})

app.get('/v1/clans/capital/:tag/:clanSelect', async (req, res) => {
  try {
    if(await verifyConsults() >= MAX_CONSULTS){
      res.json({ message: 'The limit of daily queries has been reached 😢' })
      return
    }

    const tag = req.params.tag
    const clanSelect = req.params.clanSelect
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
    // res.json(data)
    res.json({ message: getInformationCapital(data, tag, clanSelect) })
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

app.get('/v1/clans/cwl/:tag/:day', async (req, res) => {
  try {
    if(await verifyConsults() >= MAX_CONSULTS){
      res.json({ message: 'The limit of daily queries has been reached 😢' })
      return
    }
    const tag = req.params.tag
    const day = req.params.day
    const url = URL_BASE + 'clans/%23' + tag + '/currentwar/leaguegroup'

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
      // console.log({dataResponse});

      res.json({ message: getInformationCWL(dataResponse, tag, day) })
    }
    // res.json({ message: 'Errorrrrrrr no encontramos la urlWar'})
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

app.get('/v1/registers', async (req, res) => {
  res.json({ message: await verifyConsults() })
})

function getInformationCWL(data, tag, day) {
  // console.log(data);

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

  // console.log('Antes de obtener clannn...');

  let clan = []
  let starsOpponent = ''
  if (data['clan']['tag'] == '#' + tag) {
    clan = data['clan']
    starsOpponent = data['opponent']['stars']
  } else {
    if (data['opponent']['tag'] == '#' + tag) {
      clan = data['opponent']
      starsOpponent = data['clan']['stars']
    } else {
      clan = ['Errorroroorr']
    }
  }
  // console.log('Despues de obtener clannn...');
  // console.log({clan});
  let restante
  if (timeRes == 0) {
    restante = 'warEnded'
  } else {
    restante = hours + 'h ' + minutes + 'm'
  }

  let respuesta =
    '```' + clan['name'] + '```\n' +
    '🛡 *Information CWL*' + '\n' +
    '📅 *Day:* ' + day + '\n' +
    '🛠 *State:* ' + state + '\n' +
    '⭐ *Stars Clan:* ' + clan['stars'] + '\n' +
    '⭐ *Stars Opponent:* ' + starsOpponent + '\n' +
    '📊 *Percentage:* ' + (Math.round(clan['destructionPercentage'] * 100) / 100) + '%\n' +
    '⏳ *Remaining time:* ' + restante + '\n' +
    '⚔ *Attacks:* ' + clan['attacks'] + '/' + teamSize + '\n' +
    '🤺 *Remaining attacks:* ' + '\n'

  const members = clan['members']
  members.sort((a, b) => a.mapPosition - b.mapPosition)
  // console.log({members});

  for (mem of members) {
    if (!mem['attacks']) {
      respuesta += mem['name'] + ' [' + mem['townhallLevel'] + ']' + '\n'
    }
  }

  respuesta += '\n' + '_`Clash of Clans`_\n_`Community Latin Magic Warriors`_'
  registerConsult(clan['name'], 'CWL')

  return respuesta
}

function getInformationCapital(data, tag, clanSelect) {
  // console.log({ data });
  const dataResume = data['items']['0']
  const members = dataResume['members']
  const end = new Date(parseCustomDate(dataResume['endTime']))
  const now = new Date()
  const restTime = end.getTime() - now.getTime()
  // console.log({restTime});


  // Convertir milisegundos a días, horas y minutos
  const days = Math.floor(restTime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((restTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((restTime % (1000 * 60 * 60)) / (1000 * 60));

  // Construcción dinámica del formato
  let formattedTime = "";
  if (restTime > 0) {
    if (days > 0) formattedTime += `${days}d `;
    if (hours > 0 || days > 0) formattedTime += `${hours}h `;
    formattedTime += `${minutes}m`;
  } else {
    formattedTime += 'endTime'
  }

  members.sort((a, b) => b.capitalResourcesLooted - a.capitalResourcesLooted)
  // console.log({formattedTime});

  let respuesta =
    '```' + clanSelect + '```\n' +
    '🛡 *Information Capital*' + '\n' +
    '🥇 *Total loot:* ' + dataResume['capitalTotalLoot'] + '\n' +
    '⏳ *Remaining time:* ' + formattedTime + '\n' +
    '🗡 *Clan info:* ' + '\n' +
    '*Pos. Member , Attacks , Loot*' + '\n\n'
  
  let counter = 0

  for (mem of members) {
    counter++
    respuesta += counter + '. ' + mem['name'] + ' *,* ' + mem['attacks'] + '/' + (mem['attackLimit'] + mem['bonusAttackLimit']) + ' *,* ' + mem['capitalResourcesLooted'] + '\n'
  }

  respuesta += '\n' + '_`Clash of Clans`_\n_`Community Latin Magic Warriors`_'
  registerConsult(clanSelect, 'Capital')

  return respuesta
}

function getInformationWar(data, tag) {
  // console.log({data});
  
  const state = data['state']
  const teamSize = data['teamSize']
  const attacksPerMember = data['attacksPerMember']

  // const preparationTime = new Date( parseCustomDate(data['preparationStartTime']))
  const startTime = new Date(parseCustomDate(data['startTime']))
  const endTime = new Date(parseCustomDate(data['endTime']))
  const now = new Date()
  let timeRes = 0
  if (state == 'inWar') {
    timeRes = endTime.getTime() - now.getTime()
  } else {
    if (state == 'preparation') {
      timeRes = startTime.getTime() - now.getTime()
    }
  }
  const hours = Math.floor(timeRes / (1000 * 60 * 60));
  const minutes = Math.floor((timeRes % (1000 * 60 * 60)) / (1000 * 60));

  let restante
  if (timeRes <= 0) {
    restante = 'warEnded'
  } else {
    restante = hours + 'h ' + minutes + 'm'
  }

  let clan = []
  let starsOpponent = ''
  if (data['clan']['tag'] == '#' + tag) {
    clan = data['clan']
    starsOpponent = data['opponent']['stars']
  } else {
    if (data['opponent']['tag'] == '#' + tag) {
      clan = data['opponent']
      starsOpponent = data['clan']['stars']
    } else {
      clan = ['Errorroroorr']
    }
  }

  let respuesta =
    '```' + clan['name'] + '```\n' +
    '🛡 *Information War*' + '\n' +
    '🛠 *State:* ' + state + '\n' +
    '⏳ *Remaining time:* ' + restante + '\n'
    if(state != 'preparation'){
      respuesta +=
      '⭐ *Stars Clan:* ' + clan['stars'] + '\n' +
      '⭐ *Stars Opponent:* ' + starsOpponent + '\n' +
      '📊 *Percentage:* ' + (Math.round(clan['destructionPercentage'] * 100) / 100) + '%\n' +
      '⚔ *Attacks:* ' + clan['attacks'] + '/' + (teamSize * attacksPerMember) + '\n'
    }
    respuesta +=
    '🤺 *Remaining attacks:* ' + '\n' + 
    '*Pos. Member [th] , Attacks*' + '\n\n'

  const members = clan['members']
  members.sort((a, b) => a.mapPosition - b.mapPosition)
  // console.log({members});

  for (mem of members) {
    let attacksRest = 0
    if (!mem['attacks']) {
      attacksRest = 2
      if(state == 'preparation'){
        respuesta += mem['mapPosition'] + '. ' + mem['name'] + ' [' + mem['townhallLevel'] + ']' + '\n'

      }else{
        respuesta += mem['mapPosition'] + '. ' + mem['name'] + ' [' + mem['townhallLevel'] + '], ' + attacksRest + '/' + attacksPerMember + '\n'
      }
    }else{
      attacksRest = attacksPerMember - mem['attacks'].length
      if(attacksRest > 0){
        if(state == 'preparation'){
          respuesta += mem['mapPosition'] + '. ' + mem['name'] + ' [' + mem['townhallLevel'] + ']' + '\n'
        }else{
          respuesta += mem['mapPosition'] + '. ' + mem['name'] + ' [' + mem['townhallLevel'] + '], ' + attacksRest + '/' + attacksPerMember + '\n'

        }
      }
    }
  }

  respuesta += '\n' + '_`Clash of Clans`_\n_`Community Latin Magic Warriors`_'
  registerConsult(clan['name'], 'War')
  
  return respuesta

}

function parseCustomDate(dateStr) {
  // Reformatear de 'YYYYMMDDTHHmmss.sssZ' a 'YYYY-MM-DDTHH:mm:ss.sssZ'
  const formattedDate = dateStr.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d{3})Z$/,
    "$1-$2-$3T$4:$5:$6.$7Z"
  );
  return new Date(formattedDate);
}

async function verifyConsults(){
  try{
    const fecha = new Date();
    const fechaFormateada = fecha.toISOString().split("T")[0];  
    const urlSUPA = URL_BASE_SUPA + 'controls?select=*&date_consult=eq.' + fechaFormateada
    const response = await fetch(urlSUPA, {
      headers: {
        'apiKey': API_KEY_SUPA,
        'Authorization': `Bearer ${API_KEY_SUPA}`,
      }
    })
    if (!response.ok) {
      throw new Error(`Error API SUPA: ${response.status}`)
    }
    const data = await response.json()
    // console.log(data.length);
    
    return data.length
  }catch(error){
    console.log('Error en la verificación de consultas: ', error);
  }
}

async function registerConsult(clanName, typeConsult){
  try{
    const fecha = new Date();    
    const fechaFormateada = fecha.toISOString().split("T")[0]; 
     
    const urlSUPA = URL_BASE_SUPA + 'controls'
    const response = await fetch(urlSUPA, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'apiKey': API_KEY_SUPA,
        'Authorization': `Bearer ${API_KEY_SUPA}`,
      },
      body: JSON.stringify({
        'date_consult': fechaFormateada,
        'information_consult': clanName + ', ' + typeConsult
      })
    })
    // console.log({response});
    
    if (!response.ok) {
      throw new Error(`Error API SUPA: ${response.status}`)
    }
    // console.log('Consulta registrada');

    return true
    
    // const data = await response.json()
    // console.log(data.length);
    
    // return data.length
  }catch(error){
    console.log('Error en la verificación de consultas: ', error);
  }
}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

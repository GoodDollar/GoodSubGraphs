const { readFileSync, writeFileSync } = require('fs')
const path = require('path')

const filepath = path.resolve('node_modules', '@gooddollar', 'goodcontracts', 'releases', 'deployment.json')

const file = readFileSync(filepath, 'utf8')

const deployments = JSON.parse(file)

let data = ''
for (const deployment in deployments) {
  if (Object.hasOwnProperty.call(deployments, deployment)) {
    const releases = deployments[deployment];
    delete releases.network
    delete releases.networkId

    let foreignBridgeValues = []
    if (releases.ForeignBridge && typeof releases.ForeignBridge === 'object' && releases.ForeignBridge !== null) {
      foreignBridgeValues = handleObject(releases.ForeignBridge)
      delete releases.ForeignBridge
    }

    let homeBridgeValues = []
    if (releases.HomeBridge && typeof releases.HomeBridge === 'object' && releases.HomeBridge !== null) {
      homeBridgeValues = handleObject(releases.HomeBridge)
      delete releases.HomeBridge
    }


    let addresses = Object.values(releases)
    addresses = addresses.concat(foreignBridgeValues)
    addresses = addresses.concat(homeBridgeValues)
    // Make sure null address exists in array
    addresses.push('0x0000000000000000000000000000000000000000')
    addresses = [...new Set(addresses)]
    data = data + `export const ${deployment.replace('-', '_')}: Array<string> = ['${addresses.join('\',\'')}']\n`
    // break;
  }
  writeFileSync(path.resolve('./scripts/releases.ts'), data)
}

function handleObject(object) {
  delete object._blockNumber
  const values = Object.values(object)
  return values
}
// console.log(deployments);


const { readFileSync, writeFileSync } = require('fs')
const path = require('path')
const merge = require('lodash.merge')

const filepath = path.resolve('node_modules', '@gooddollar', 'goodcontracts', 'releases', 'deployment.json')
const stakingModelPath = path.resolve('node_modules', '@gooddollar', 'goodcontracts', 'stakingModel', 'releases', 'deployment.json')
const upgradablesPath = path.resolve('node_modules', '@gooddollar', 'goodcontracts', 'upgradables', 'releases', 'deployment.json')

const file = readFileSync(filepath, 'utf8')
const stakingModelFile = readFileSync(stakingModelPath, 'utf8')
const upgradablesFile = readFileSync(upgradablesPath, 'utf8')

const deployments = JSON.parse(file)
const stakingModelDeployments = JSON.parse(stakingModelFile)
const upgradablesDeployments = JSON.parse(upgradablesFile)
const mergedDeployments = merge(deployments, stakingModelDeployments, upgradablesDeployments)

let data = ''
for (const deployment in mergedDeployments) {
  if (Object.hasOwnProperty.call(mergedDeployments, deployment)) {
    const releases = mergedDeployments[deployment];
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
    data = data + `export const ${deployment.replace('-', '_')}: Array<string> = ['${addresses.join('\',\'').toLowerCase()}']\n`
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


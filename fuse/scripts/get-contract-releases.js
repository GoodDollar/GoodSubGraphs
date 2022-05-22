const { readFileSync, writeFileSync } = require('fs')
const path = require('path')
const merge = require('lodash.merge')

const c1 = require('@gooddollar/goodcontracts/releases/deployment.json')
const c2 = require('@gooddollar/goodcontracts/stakingModel/releases/deployment.json')
const c3 = require('@gooddollar/goodcontracts/upgradables/releases/deployment.json')
const c4 = require('@gooddollar/goodprotocol/releases/deployment.json')

const mergedDeployments = merge(c1, c2, c3, c4)
let data = ''
let allAddresses = []

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
    if(releases.StakingContracts && typeof releases.StakingContracts === 'object')
    {
      releases.StakingContracts = releases.StakingContracts.map(_ => _[0])
      console.log(releases.StakingContracts)
    }
    if(releases.StakingContractsV2 && typeof releases.StakingContractsV2 === 'object')
    {
      releases.StakingContractsV2 = releases.StakingContractsV2.map(_ => _[0])
      console.log(releases.StakingContractsV2)
    }


    let addresses = Object.values(releases)
    addresses = addresses.concat(foreignBridgeValues)
    addresses = addresses.concat(homeBridgeValues)
    // Make sure null address exists in array
    addresses.push('0x0000000000000000000000000000000000000000')
    addresses = [...new Set(addresses)]
    allAddresses = allAddresses.concat(addresses)
    data = data + `export const ${deployment.replace(/-/g, '_')}: Array<string> = ['${addresses.join('\',\'').toLowerCase()}']\n`
    // break;
  }
}
data = data + `export const allAddresses: Array<string> = ['${allAddresses.join('\',\'').toLowerCase()}']\n`
writeFileSync(path.resolve('./scripts/releases.ts'), data)

function handleObject(object) {
  delete object._blockNumber
  const values = Object.values(object)
  return values
}
// console.log(deployments);


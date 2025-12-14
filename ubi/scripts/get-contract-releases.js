const { readFileSync, writeFileSync } = require('fs')
const path = require('path')
const merge = require('lodash.merge')
const flatten = require('lodash').flatten
const uniq = require('lodash').uniq

const c1 = require('@gooddollar/goodcontracts/releases/deployment.json')
const c2 = require('@gooddollar/goodcontracts/stakingModel/releases/deployment.json')
const c3 = require('@gooddollar/goodcontracts/upgradables/releases/deployment.json')
const c4 = require('@gooddollar/goodprotocol/releases/deployment.json')
const c5 = require('@gooddollar/bridge-contracts/release/deployment.json')

let mergedDeployments = [c1, c2, c3, c4,c5]
console.log({mergedDeployments})

const finalAddrs = mergedDeployments.map(deployment => {
  const envsAddrs = flatten(Object.values(deployment).map(env => {
    delete env.network
    delete env.networkId
    return Object.values(env)
  }))

  const finalAddrs = envsAddrs.map(possibleAddr => {
    if(typeof possibleAddr === 'string')
      return possibleAddr
    if(typeof possibleAddr === 'object')
    {
      //handle staking contracts field
      if(possibleAddr.length>0)
        return possibleAddr.map(_ => _[0])

      //handle bridge fields
      return Object.values(possibleAddr).filter(_ => typeof _ === 'string' && _.startsWith('0x'))
    }
    return []
  })
  return flatten(finalAddrs)
})
finalAddrs.push('0x0000000000000000000000000000000000000000')
const allAddresses = uniq(flatten(finalAddrs).map(_ => _.toLowerCase()))

console.log({allAddresses})

const data = `export const allAddresses: Array<string> = ['${allAddresses.join('\',\'').toLowerCase()}']\n`
writeFileSync(path.resolve('./scripts/releases.ts'), data)

// console.log(deployments);


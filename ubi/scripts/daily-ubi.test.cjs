const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { stripTypeScriptTypes } = require("node:module");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const nativeBigInt = global.BigInt;

class GraphBigInt {
  constructor(value) {
    this.value = nativeBigInt(value);
  }
  static fromI32(value) {
    return value === 0 ? zero : new GraphBigInt(value);
  }
  static zero() {
    return zero;
  }
  plus(other) {
    return new GraphBigInt(this.value + other.value);
  }
  minus(other) {
    return new GraphBigInt(this.value - other.value);
  }
  times(other) {
    return new GraphBigInt(this.value * other.value);
  }
  div(other) {
    return new GraphBigInt(this.value / other.value);
  }
  equals(other) {
    return this.value === other.value;
  }
  gt(other) {
    return this.value > other.value;
  }
  ge(other) {
    return this.value >= other.value;
  }
  lt(other) {
    return this.value < other.value;
  }
  toString() {
    return this.value.toString();
  }
}

const zero = new GraphBigInt(0);
const integer = (value) => new GraphBigInt(value);
const address = (value) => ({ toHex: () => value, toHexString: () => value });
const dayStart = Date.parse("2026-04-16T00:00:00Z") / 1000;
const schemeAddress = "0xd253a5203817225e9768c05e5996d642fb96ba86";

async function loadMapping(folder) {
  const store = new Map();
  function entity(name) {
    return class {
      constructor(id) {
        this.id = id;
      }
      static load(id) {
        const saved = store.get(`${name}:${id}`);
        return saved ? Object.assign(new this(id), saved) : null;
      }
      save() {
        if (name === "DailyUBI") {
          for (const field of [
            "newClaimers",
            "totalClaims",
            "totalUBIDistributed",
          ]) {
            assert.ok(
              this[field] instanceof GraphBigInt,
              `${name}.${field} must be initialized`,
            );
          }
          assert.ok(!("newWallets" in this));
          assert.ok(!("uniqueClaimers" in this));
        }
        store.set(`${name}:${this.id}`, { ...this });
      }
    };
  }
  const DailyUBI = entity("DailyUBI");
  const WalletStat = entity("WalletStat");
  const GlobalStatistics = entity("GlobalStatistics");
  function initCitizen(id) {
    const citizen = new WalletStat(id);
    for (const field of [
      "dateJoined",
      "firstVerified",
      "firstClaimed",
      "lastClaimed",
      "claimStreak",
      "longestClaimStreak",
      "totalClaimedCount",
      "totalClaimedValue",
    ]) {
      citizen[field] = zero;
    }
    return citizen;
  }
  const scheme = {
    try_claimDay: () => ({
      reverted: false,
      value: { getAmountOfClaimers: () => integer(7) },
    }),
    activeUsersCount: () => integer(7),
    dailyCyclePool: () => integer(1000),
    cycleLength: () => integer(30),
    currentDayInCycle: () => integer(1),
  };
  const modules = {
    "@graphprotocol/graph-ts": {
      BigInt: GraphBigInt,
      log: { info() {} },
      Address: { fromString: address },
      dataSource: { context: () => ({ getString: () => "token" }) },
      ethereum: {},
    },
    "../generated/UBIScheme/UBIScheme": {
      UBIScheme: { bind: () => scheme },
      UBICalculated: {},
      UBIClaimed: {},
      UBICycleCalculated: {},
      ActivatedUser: {},
      InactiveUserFished: {},
    },
    "../generated/UBISchemeV3/UBISchemeV2": {
      UBISchemeV2: { bind: () => scheme },
    },
    "../generated/GoodDollar/GoodDollar": {
      GoodDollar: { bind: () => ({ balanceOf: () => integer(500) }) },
    },
    "../generated/Identity/Identity": {
      WhitelistedAdded: {},
      WhitelistedRemoved: {},
    },
    "../generated/schema": { DailyUBI, WalletStat, GlobalStatistics },
    "./gd-mapping": { initCitizen },
  };
  const filename = path.join(root, folder, "src/mapping.ts");
  const source = stripTypeScriptTypes(readFileSync(filename, "utf8"));
  const mapping = new vm.SourceTextModule(source, { identifier: filename });
  await mapping.link((specifier) => {
    const exports = modules[specifier];
    assert.ok(exports, `Unexpected import: ${specifier}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports))
        this.setExport(name, value);
    });
  });
  await mapping.evaluate();
  return {
    handlers: mapping.namespace,
    daily: (timestamp, contract = schemeAddress) => {
      const day =
        folder === "ubi"
          ? Math.floor(timestamp / 86400)
          : contract === "0xaacbaab8571cbeceb46ba85b5981efdb8928545e"
            ? Math.trunc((timestamp - 1596195612) / 86400)
            : Math.trunc((timestamp - 1612267200) / 86400) + 186;
      return DailyUBI.load(day.toString());
    },
    statistics: () => GlobalStatistics.load("statistics"),
    wallet: (id) => WalletStat.load(id),
    seedWallet: (id) => initCitizen(id).save(),
  };
}

function event(
  timestamp,
  wallet = "alice",
  amount = 100,
  contract = schemeAddress,
) {
  return {
    address: address(contract),
    block: { timestamp: integer(timestamp) },
    params: {
      claimer: address(wallet),
      account: address(wallet),
      amount: integer(amount),
      day: integer(10),
      dailyUbi: integer(20),
    },
  };
}

function counts(row, expected) {
  assert.ok(row, "Daily row must exist");
  for (const [field, value] of Object.entries(expected)) {
    assert.equal(row[field].toString(), String(value), field);
  }
}

for (const folder of ["ubi", "fuse"]) {
  test(`${folder}: an early claim creates a complete daily row`, async () => {
    const mapping = await loadMapping(folder);
    mapping.handlers.handleUBIClaimed(event(dayStart + 60));
    counts(mapping.daily(dayStart), {
      totalClaims: 1,
      totalUBIDistributed: 100,
      newClaimers: 1,
    });
    counts(mapping.statistics(), {
      totalClaims: 1,
      totalUBIDistributed: 100,
      uniqueClaimers: 1,
      uniqueWallets: 0,
    });
    counts(mapping.wallet("alice"), {
      firstClaimed: dayStart + 60,
      lastClaimed: dayStart + 60,
      totalClaimedCount: 1,
    });
  });

  test(`${folder}: first verification is separate from first claim and re-verification`, async () => {
    const mapping = await loadMapping(folder);
    mapping.handlers.handleWhitelistedAdded(event(dayStart + 60));
    mapping.handlers.handleWhitelistedAdded(event(dayStart + 120));
    counts(mapping.daily(dayStart), { newClaimers: 0, totalClaims: 0 });
    mapping.handlers.handleUBIClaimed(event(dayStart + 180));
    counts(mapping.daily(dayStart), { newClaimers: 1 });
    mapping.handlers.handleWhitelistedRemoved(event(dayStart + 86400));
    mapping.handlers.handleWhitelistedAdded(event(dayStart + 86460));
    counts(mapping.daily(dayStart + 86400), { newClaimers: 0 });
    counts(mapping.statistics(), { uniqueWallets: 1, uniqueClaimers: 1 });
    counts(mapping.wallet("alice"), {
      firstVerified: dayStart + 60,
      dateJoined: dayStart + 60,
    });
  });

  test(`${folder}: repeat claims do not create new first-time claimers on later days`, async () => {
    const mapping = await loadMapping(folder);
    mapping.handlers.handleUBIClaimed(event(dayStart + 60));
    mapping.handlers.handleUBIClaimed(event(dayStart + 120));
    mapping.handlers.handleUBIClaimed(event(dayStart + 86460));
    counts(mapping.daily(dayStart), {
      totalClaims: 2,
      totalUBIDistributed: 200,
      newClaimers: 1,
    });
    counts(mapping.daily(dayStart + 86400), {
      totalClaims: 1,
      totalUBIDistributed: 100,
      newClaimers: 0,
    });
    counts(mapping.statistics(), {
      totalClaims: 3,
      totalUBIDistributed: 300,
      uniqueClaimers: 1,
    });
  });

  test(`${folder}: a pre-existing non-claiming wallet is a new claimer`, async () => {
    const mapping = await loadMapping(folder);
    mapping.seedWallet("alice");
    mapping.handlers.handleUBIClaimed(event(dayStart + 60));
    counts(mapping.daily(dayStart), { newClaimers: 1 });
  });

  test(`${folder}: distinct wallets count separately across scheme addresses`, async () => {
    const mapping = await loadMapping(folder);
    mapping.handlers.handleUBIClaimed(event(dayStart + 60));
    mapping.handlers.handleUBIClaimed(
      event(dayStart + 120, "alice", 100, "other-scheme"),
    );
    mapping.handlers.handleUBIClaimed(event(dayStart + 180, "bob", 200));
    counts(mapping.daily(dayStart), {
      totalClaims: 3,
      totalUBIDistributed: 400,
      newClaimers: 2,
    });
  });

  for (const handler of folder === "fuse"
    ? ["handleUBICalculated", "handleUBICalculatedV2"]
    : ["handleUBICalculated"]) {
    test(`${folder}: ${handler} preserves early counters`, async () => {
      const mapping = await loadMapping(folder);
      const timestamp = dayStart + 13 * 3600;
      mapping.handlers.handleUBIClaimed(event(timestamp));
      mapping.handlers[handler](event(timestamp + 60));
      counts(mapping.daily(timestamp), {
        totalClaims: 1,
        totalUBIDistributed: 100,
        newClaimers: 1,
        activeUsers: 7,
      });
      mapping.handlers[handler](event(timestamp + 86400));
      counts(mapping.daily(timestamp + 86400), {
        totalClaims: 0,
        newClaimers: 0,
      });
    });
  }
}

test("fuse: legacy cutoff and initial scheme-calculation exclusion are preserved", async () => {
  const mapping = await loadMapping("fuse");
  const oldScheme = "0xaacbaab8571cbeceb46ba85b5981efdb8928545e";
  const newScheme = "0xd7ac544f8a570c4d8764c3aabcf6870cbd960d0d";
  const legacyStart = 1596195612;
  const transition = 1612267200;
  mapping.handlers.handleUBIClaimed(
    event(legacyStart + 186 * 86400, "alice", 100, oldScheme),
  );
  counts(mapping.daily(legacyStart + 186 * 86400, oldScheme), {
    totalClaims: 1,
  });
  mapping.handlers.handleUBIClaimed(
    event(legacyStart + 187 * 86400, "bob", 100, oldScheme),
  );
  assert.equal(mapping.daily(legacyStart + 187 * 86400, oldScheme), null);
  const beforeCalculation = mapping.daily(transition);
  mapping.handlers.handleUBICalculated(
    event(transition + 60, "alice", 100, newScheme),
  );
  assert.deepEqual(mapping.daily(transition), beforeCalculation);
  mapping.handlers.handleUBIClaimed(
    event(transition + 120, "carol", 100, newScheme),
  );
  counts(mapping.daily(transition), { totalClaims: 2, newClaimers: 2 });
});

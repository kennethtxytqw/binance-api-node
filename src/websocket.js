import zip from 'lodash.zipobject'

import httpMethods from 'http-client'
import openWebSocket from 'open-websocket'

const BASE = 'wss://stream.binance.com:9443/ws'
const FUTURES = 'wss://fstream.binance.com/ws'

const depthTransform = m => ({
  eventType: m.e,
  eventTime: m.E,
  symbol: m.s,
  firstUpdateId: m.U,
  finalUpdateId: m.u,
  bidDepth: m.b.map(b => zip(['price', 'quantity'], b)),
  askDepth: m.a.map(a => zip(['price', 'quantity'], a)),
})

const futuresDepthTransform = m => ({
  eventType: m.e,
  eventTime: m.E,
  transactionTime: m.T,
  symbol: m.s,
  firstUpdateId: m.U,
  finalUpdateId: m.u,
  prevFinalUpdateId: m.pu,
  bidDepth: m.b.map(b => zip(['price', 'quantity'], b)),
  askDepth: m.a.map(a => zip(['price', 'quantity'], a)),
})

const depth = (payload, cb, transform = true, variator) => {
  const cache = (Array.isArray(payload) ? payload : [payload]).map(symbol => {
    const w = openWebSocket(`${variator === 'futures' ? FUTURES : BASE}/${symbol.toLowerCase()}@depth`)
    w.onmessage = msg => {
      const obj = JSON.parse(msg.data)

      cb(transform ? (variator === 'futures' ? futuresDepthTransform(obj) : depthTransform(obj)) : obj)
    }

    return w
  })

  return options =>
    cache.forEach(w => w.close(1000, 'Close handle was called', { keepClosed: true, ...options }))
}

const partialDepthTransform = (symbol, level, m) => ({
  symbol,
  level,
  lastUpdateId: m.lastUpdateId,
  bids: m.bids.map(b => zip(['price', 'quantity'], b)),
  asks: m.asks.map(a => zip(['price', 'quantity'], a)),
})

const futuresPartDepthTransform = (level, m) => ({
  level,
  eventType: m.e,
  eventTime: m.E,
  transactionTime: m.T,
  symbol: m.s,
  firstUpdateId: m.U,
  finalUpdateId: m.u,
  prevFinalUpdateId: m.pu,
  bidDepth: m.b.map(b => zip(['price', 'quantity'], b)),
  askDepth: m.a.map(a => zip(['price', 'quantity'], a)),
})

const partialDepth = (payload, cb, transform = true, variator) => {
  const cache = (Array.isArray(payload) ? payload : [payload]).map(({ symbol, level }) => {
    const w = openWebSocket(`${variator === 'futures' ? FUTURES : BASE}/${symbol.toLowerCase()}@depth${level}`)
    w.onmessage = msg => {
      const obj = JSON.parse(msg.data)

      cb(transform ? (variator === 'futures' ? futuresPartDepthTransform(level, obj) : partialDepthTransform(symbol, level, obj)) : obj)
    }

    return w
  })

  return options =>
    cache.forEach(w => w.close(1000, 'Close handle was called', { keepClosed: true, ...options }))
}

const candles = (payload, interval, cb, transform = true, variator) => {
  if (!interval || !cb) {
    throw new Error('Please pass a symbol, interval and callback.')
  }

  const cache = (Array.isArray(payload) ? payload : [payload]).map(symbol => {
    const w = openWebSocket(`${variator === 'futures' ? FUTURES : BASE}/${symbol.toLowerCase()}@kline_${interval}`)
    w.onmessage = msg => {
      const obj = JSON.parse(msg.data)
      const { e: eventType, E: eventTime, s: symbol, k: tick } = obj
      const {
        t: startTime,
        T: closeTime,
        f: firstTradeId,
        L: lastTradeId,
        o: open,
        h: high,
        l: low,
        c: close,
        v: volume,
        n: trades,
        i: interval,
        x: isFinal,
        q: quoteVolume,
        V: buyVolume,
        Q: quoteBuyVolume,
      } = tick

      cb(transform ? {
        eventType,
        eventTime,
        symbol,
        startTime,
        closeTime,
        firstTradeId,
        lastTradeId,
        open,
        high,
        low,
        close,
        volume,
        trades,
        interval,
        isFinal,
        quoteVolume,
        buyVolume,
        quoteBuyVolume,
      } : obj)
    }

    return w
  })

  return options =>
    cache.forEach(w => w.close(1000, 'Close handle was called', { keepClosed: true, ...options }))
}

const tickerTransform = m => ({
  eventType: m.e,
  eventTime: m.E,
  symbol: m.s,
  priceChange: m.p,
  priceChangePercent: m.P,
  weightedAvg: m.w,
  prevDayClose: m.x,
  curDayClose: m.c,
  closeTradeQuantity: m.Q,
  bestBid: m.b,
  bestBidQnt: m.B,
  bestAsk: m.a,
  bestAskQnt: m.A,
  open: m.o,
  high: m.h,
  low: m.l,
  volume: m.v,
  volumeQuote: m.q,
  openTime: m.O,
  closeTime: m.C,
  firstTradeId: m.F,
  lastTradeId: m.L,
  totalTrades: m.n,
})

const futuresTickerTransform = m => ({
  eventType: m.e,
  eventTime: m.E,
  symbol: m.s,
  priceChange: m.p,
  priceChangePercent: m.P,
  weightedAvg: m.w,
  curDayClose: m.c,
  closeTradeQuantity: m.Q,
  open: m.o,
  high: m.h,
  low: m.l,
  volume: m.v,
  volumeQuote: m.q,
  openTime: m.O,
  closeTime: m.C,
  firstTradeId: m.F,
  lastTradeId: m.L,
  totalTrades: m.n,
})

const futuresMarkPriceTransform = m => ({
  eventType: m.e,
  eventTime: m.E,
  symbol: m.s,
  priceChange: m.p,
  priceChangePercent: m.P,
  fundingRate: m.r,
})

const ticker = (payload, cb, transform = true, variator) => {
  const cache = (Array.isArray(payload) ? payload : [payload]).map(symbol => {
    const w = openWebSocket(`${variator === 'futures' ? FUTURES : BASE}/${symbol.toLowerCase()}@ticker`)

    w.onmessage = msg => {
      const obj = JSON.parse(msg.data)
      cb(transform ? (variator === 'futures' ? futuresTickerTransform(obj) : tickerTransform(obj)) : obj)
    }

    return w
  })

  return options =>
    cache.forEach(w => w.close(1000, 'Close handle was called', { keepClosed: true, ...options }))
}

const allTickers = (cb, transform = true, variator) => {
  const w = new openWebSocket(`${variator === 'futures' ? FUTURES : BASE}/!ticker@arr`)

  w.onmessage = msg => {
    const arr = JSON.parse(msg.data)
    cb(transform ? (variator === 'futures' ? arr.map(m => futuresTickerTransform(m)) : arr.map(m => tickerTransform(m))) : arr)
  }

  return options => w.close(1000, 'Close handle was called', { keepClosed: true, ...options })
}

const markPrice = (payload, cb, transform = true, variator) => {
  const cache = (Array.isArray(payload) ? payload : [payload]).map(symbol => {
    const w = openWebSocket(`${variator === 'futures' ? FUTURES : BASE}/${symbol.toLowerCase()}@markPrice`)

    w.onmessage = msg => {
      const obj = JSON.parse(msg.data)
      cb(transform ? (variator === 'futures' ? futuresMarkPriceTransform(obj) : markPriceTransform(obj)) : obj)
    }

    return w
  })

  return options =>
    cache.forEach(w => w.close(1000, 'Close handle was called', { keepClosed: true, ...options }))
}

const allMarkPrices = (cb, transform = true, variator) => {
  const w = new openWebSocket(`${variator === 'futures' ? FUTURES : BASE}/!markPrice@arr`)

  w.onmessage = msg => {
    const arr = JSON.parse(msg.data)
    cb(transform ? (variator === 'futures' ? arr.map(m => futuresMarkPriceTransform(m)) : arr.map(m => markPriceTransform(m))) : arr)
  }

  return options => w.close(1000, 'Close handle was called', { keepClosed: true, ...options })
}

const aggTradesTransform = m => ({
  eventType: m.e,
  eventTime: m.E,
  timestamp: m.T,
  symbol: m.s,
  price: m.p,
  quantity: m.q,
  isBuyerMaker: m.m,
  wasBestPrice: m.M,
  aggId: m.a,
  firstId: m.f,
  lastId: m.l,
})

const futuresAggTradesTransform = m => ({
  eventType: m.e,
  eventTime: m.E,
  symbol: m.s,
  aggId: m.a,
  price: m.p,
  quantity: m.q,
  firstId: m.f,
  lastId: m.l,
  timestamp: m.T,
  isBuyerMaker: m.m,
})

const aggTrades = (payload, cb, transform = true, variator) => {
  const cache = (Array.isArray(payload) ? payload : [payload]).map(symbol => {
    const w = openWebSocket(`${variator === 'futures' ? FUTURES : BASE}/${symbol.toLowerCase()}@aggTrade`)
    w.onmessage = msg => {
      const obj = JSON.parse(msg.data)

      cb(transform ? (variator === 'futures' ? futuresAggTradesTransform(obj) : aggTradesTransform(obj)) : obj)
    }

    return w
  })

  return options =>
    cache.forEach(w => w.close(1000, 'Close handle was called', { keepClosed: true, ...options }))
}

const tradesTransform = m => ({
  eventType: m.e,
  eventTime: m.E,
  tradeTime: m.T,
  symbol: m.s,
  price: m.p,
  quantity: m.q,
  isBuyerMaker: m.m,
  maker: m.M,
  tradeId: m.t,
  buyerOrderId: m.b,
  sellerOrderId: m.a,
})

const trades = (payload, cb, transform = true) => {
  const cache = (Array.isArray(payload) ? payload : [payload]).map(symbol => {
    const w = openWebSocket(`${BASE}/${symbol.toLowerCase()}@trade`)
    w.onmessage = msg => {
      const obj = JSON.parse(msg.data)

      cb(transform ? tradesTransform(obj) : obj)
    }

    return w
  })

  return options =>
    cache.forEach(w => w.close(1000, 'Close handle was called', { keepClosed: true, ...options }))
}

const userTransforms = {
  // https://github.com/binance-exchange/binance-official-api-docs/blob/master/user-data-stream.md#balance-update
  balanceUpdate: m => ({
    asset: m.a,
    balanceDelta: m.d,
    clearTime: m.T,
    eventTime: m.E,
    eventType: 'balanceUpdate',
  }),
  // https://github.com/binance-exchange/binance-official-api-docs/blob/master/user-data-stream.md#account-update
  outboundAccountInfo: m => ({
    eventType: 'account',
    eventTime: m.E,
    makerCommissionRate: m.m,
    takerCommissionRate: m.t,
    buyerCommissionRate: m.b,
    sellerCommissionRate: m.s,
    canTrade: m.T,
    canWithdraw: m.W,
    canDeposit: m.D,
    lastAccountUpdate: m.u,
    balances: m.B.reduce((out, cur) => {
      out[cur.a] = { available: cur.f, locked: cur.l }
      return out
    }, {}),
  }),
  // https://github.com/binance-exchange/binance-official-api-docs/blob/master/user-data-stream.md#account-update
  outboundAccountPosition: m => ({
    balances: m.B.map(({a, f, l}) => ({asset: a, free: f, locked: l})),
    eventTime: m.E,
    eventType: 'outboundAccountPosition',
    lastAccountUpdate: m.u,
  }),
  // https://github.com/binance-exchange/binance-official-api-docs/blob/master/user-data-stream.md#order-update
  executionReport: m => ({
    eventType: 'executionReport',
    eventTime: m.E,
    symbol: m.s,
    newClientOrderId: m.c,
    originalClientOrderId: m.C,
    side: m.S,
    orderType: m.o,
    timeInForce: m.f,
    quantity: m.q,
    price: m.p,
    executionType: m.x,
    stopPrice: m.P,
    icebergQuantity: m.F,
    orderStatus: m.X,
    orderRejectReason: m.r,
    orderId: m.i,
    orderTime: m.T,
    lastTradeQuantity: m.l,
    totalTradeQuantity: m.z,
    priceLastTrade: m.L,
    commission: m.n,
    commissionAsset: m.N,
    tradeId: m.t,
    isOrderWorking: m.w,
    isBuyerMaker: m.m,
    creationTime: m.O,
    totalQuoteTradeQuantity: m.Z,
    orderListId: m.g,
    quoteOrderQuantity: m.Q,
    lastQuoteTransacted: m.Y,
  }),
}

const futuresUserTransforms = {
  // https://binance-docs.github.io/apidocs/futures/en/#event-margin-call
  MARGIN_CALL: m => ({
    eventTime: m.E,
    crossWalletBalance: m.cw,
    eventType: 'MARGIN_CALL',
    positions: m.p.reduce((out, cur) => {
      out[cur.a] = {
        symbol: cur.s,
        positionSide: cur.ps,
        positionAmount: cur.pa,
        marginType: cur.mt,
        isolatedWallet: cur.iw,
        markPrice: cur.mp,
        unrealizedPnL: cur.up,
        maintenanceMarginRequired: cur.mm,
      }
      return out
    }, {}),
  }),
  // https://binance-docs.github.io/apidocs/futures/en/#event-balance-and-position-update
  ACCOUNT_UPDATE: m => ({
    eventTime: m.E,
    transactionTime: m.T,
    eventType: 'ACCOUNT_UPDATE',
    eventReasonType: m.a.m,
    balances: m.a.B.reduce((out, cur) => {
      out[cur.a] = { asset: cur.a, walletBalance: cur.wb, crossWalletBalance: cur.cw }
      return out
    }, {}),
    positions: m.a.P.reduce((out, cur) => {
      out[cur.a] = {
        symbol: cur.s,
        positionAmount: cur.pa,
        entryPrice: cur.ep,
        accumulatedRealized: cur.cr,
        unrealizedPnL: cur.up,
        marginType: cur.mt,
        isolatedWallet: cur.iw,
        positionSide: cur.ps,
      }
      return out
    }, {}),
  }),
  // https://binance-docs.github.io/apidocs/futures/en/#event-order-update
  ORDER_TRADE_UPDATE: m => ({
    eventType: 'ORDER_TRADE_UPDATE',
    eventTime: m.E,
    transactionTime: m.T,
    symbol: m.o.s,
    clientOrderId: m.o.c,
    side: m.o.S,
    orderType: m.o.o,
    timeInForce: m.o.f,
    quantity: m.o.q,
    price: m.o.p,
    averagePrice: m.o.ap,
    stopPrice: m.o.sp,
    executionType: m.o.x,
    orderStatus: m.o.X,
    orderId: m.o.i,
    lastTradeQuantity: m.o.l,
    totalTradeQuantity: m.o.z,
    priceLastTrade: m.o.L,
    commissionAsset: m.o.N,
    commission: m.o.n,
    orderTime: m.o.T,
    tradeId: m.o.t,
    bidsNotional: m.o.b,
    asksNotional: m.o.a,
    isMaker: m.o.m,
    isReduceOnly: m.o.R,
    workingType: m.o.wt,
    originalOrderType: m.o.ot,
    positionSide: m.o.ps,
    closePosition: m.o.cp,
    activationPrice: m.o.AP,
    callbackRate: m.o.cr,
    realizedProfit: m.o.rp,
  }),
}

export const userEventHandler = (cb, transform = true, variator) => msg => {
  const { e: type, ...rest } = JSON.parse(msg.data)

  cb(
      variator === 'futures' ?
      transform && futuresUserTransforms[type] ? futuresUserTransforms[type](rest) : { type, ...rest } :
      transform && userTransforms[type] ? userTransforms[type](rest) : { type, ...rest }
  )
}

const STREAM_METHODS = ['get', 'keep', 'close']

const capitalize = (str, check) => (check ? `${str[0].toUpperCase()}${str.slice(1)}` : str)

const getStreamMethods = (opts, variator = '') => {
  const methods = httpMethods(opts)

  return STREAM_METHODS.reduce(
    (acc, key) => [...acc, methods[`${variator}${capitalize(`${key}DataStream`, !!variator)}`]],
    [],
  )
}

export const keepStreamAlive = (method, listenKey) => method({ listenKey })

const user = (opts, variator) => (cb, transform) => {
  const [getDataStream, keepDataStream, closeDataStream] = getStreamMethods(opts, variator)

  let currentListenKey = null
  let int = null
  let w = null

  const keepAlive = isReconnecting => {
    if (currentListenKey) {
      keepStreamAlive(keepDataStream, currentListenKey).catch(() => {
        closeStream({}, true)

        if (isReconnecting) {
          setTimeout(() => makeStream(true), 30e3)
        } else {
          makeStream(true)
        }
      })
    }
  }

  const closeStream = (options, catchErrors) => {
    if (currentListenKey) {
      clearInterval(int)

      const p = closeDataStream({ listenKey: currentListenKey })

      if (catchErrors) {
        p.catch(f => f)
      }

      w.close(1000, 'Close handle was called', { keepClosed: true, ...options })
      currentListenKey = null
    }
  }

  const makeStream = isReconnecting => {
    return getDataStream()
      .then(({ listenKey }) => {
        w = openWebSocket(`${variator === 'futures' ? FUTURES : BASE}/${listenKey}`)
        w.onmessage = msg => userEventHandler(cb, transform, variator)(msg)

        currentListenKey = listenKey

        int = setInterval(() => keepAlive(false), 50e3)

        keepAlive(true)

        return options => closeStream(options)
      })
      .catch(err => {
        if (isReconnecting) {
          setTimeout(() => makeStream(true), 30e3)
        } else {
          throw err
        }
      })
  }

  return makeStream(false)
}

export default opts => ({
  depth,
  partialDepth,
  candles,
  trades,
  aggTrades,
  ticker,
  allTickers,
  user: user(opts),

  marginUser: user(opts, 'margin'),

  futuresDepth: (payload, cb, transform) => depth(payload, cb, transform, 'futures'),
  futuresPartialDepth: (payload, cb, transform) => partialDepth(payload, cb, transform, 'futures'),
  futuresCandles: (payload, interval, cb, transform) => candles(payload, interval, cb, transform, 'futures'),
  futuresTicker: (payload, cb, transform) => ticker(payload, cb, transform, 'futures'),
  futuresAllTickers: (cb, transform) => allTickers(cb, transform, 'futures'),
  futuresMarkPrice: (cb, transform) => markPrice(cb, transform, 'futures'),
  futuresAllMarkPrices: (cb, transform) => allMarkPrices(cb, transform, 'futures'),
  futuresAggTrades: (payload, cb, transform) => aggTrades(payload, cb, transform, 'futures'),
  futuresUser: user(opts, 'futures'),
})

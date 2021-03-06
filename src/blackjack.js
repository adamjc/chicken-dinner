const { Deck } = require('./deck.js')

const STATES = {
  READY: 1,
  DEAL_PLAYER: 2,
  DEAL_DEALER: 3,
  PLAYER_TURN: 4,
  DEALER_TURN: 5,
  CALCULATE_WINNER: 6,
  DONE: 7
}

function Blackjack (dealerStandValue = 17, session = {}) {
  const BLACKJACK = 21
  const DEALER_STAND_VALUE = dealerStandValue

  let state = session.state || STATES.READY
  let deck = session.deck || new Deck()
  let dealerHand = session.dealerHand || []
  let player = session.player || { hand: [], chips: 100, wagered: 0 }

  const stand = () => state = STATES.DEALER_TURN
  const dealCard = (faceUp = true) => deck.take(faceUp)

  // starts the game
  function wager (amount = 0) {
    if (amount > player.chips) return

    player.wagered = amount
    player.chips -= amount

    state = STATES.DEAL_PLAYER
  }

  function getActions () {
    switch (state) {
      case STATES.READY: return { wager }
      case STATES.PLAYER_TURN: return { hit, stand }
      default: return []
    }
  }

  // do a step
  function step () {
    switch (state) {
      case STATES.DEAL_PLAYER:
        dealPlayer()
        return
      case STATES.DEAL_DEALER:
        dealDealer()
        return
      case STATES.DEALER_TURN:
        dealerTurn()
        return
      case STATES.CALCULATE_WINNER:
        calculateWinner()
    }
  }

  function dealerTurn () {
    const faceDownCards = dealerHand.filter(card => ! card.getDetails())
    faceDownCards.forEach(card => card.turn())

    if (total(dealerHand, true) >= DEALER_STAND_VALUE) {
      state = STATES.CALCULATE_WINNER
    } else {
      hit()
    }
  }

  function stepUntilChange () {
    const statesWithMultipleSteps = [STATES.DEAL_PLAYER, STATES.DEAL_DEALER, STATES.DEALER_TURN, STATES.CALCULATE_WINNER]
    if (statesWithMultipleSteps.includes(state)) {
      const initialState = state

      while (initialState === state) {
        step()
      }
    } else {
      step()
    }
  }

  function dealPlayer () {
    if (player.hand.length < 2) {
      player.hand.push(dealCard())
    }

    if (player.hand.length === 2) {
      state = total(player.hand) === BLACKJACK
        ? STATES.CALCULATE_WINNER
        : STATES.DEAL_DEALER
    }
  }

  function dealDealer () {
    if (!dealerHand.length) {
      dealerHand.push(dealCard())
    } else if (dealerHand.length === 1) {
      dealerHand.push(dealCard(false))
      state = STATES.PLAYER_TURN
    }
  }

  function hit () {
    if (state === STATES.PLAYER_TURN) {
      player.hand.push(dealCard())
      const playerTotal = total(player.hand)

      if (playerTotal === BLACKJACK) {
        state = STATES.DEALER_TURN
      } else if (playerTotal > BLACKJACK) {
        state = STATES.CALCULATE_WINNER
      }
    } else if (state === STATES.DEALER_TURN) {
      dealerHand.push(dealCard())

      if (total(dealerHand) >= DEALER_STAND_VALUE) {
        state = STATES.CALCULATE_WINNER
      }
    }
  }

  function total (cards, calculateFaceDown = true) {
    let faceDownCards = []
    if (calculateFaceDown) {
      faceDownCards = cards.filter(card => !card.getDetails())
    } else {
      cards = cards.filter(card => card.getDetails())
    }
    faceDownCards.forEach(card => card.turn())

    let nonAceValues = cards.filter(card => card.getDetails().rank !== 'A')
                            .reduce((acc, card) => acc + cardValue(card), 0)

    const aces = cards.filter(card => card.getDetails().rank === 'A')

    const total = aces.reduce((runningTotal, ace, i, a) => {
      const acesLeft = a.length - (i + 1)

      if (runningTotal + cardValue(ace) + acesLeft > 21) {
        return runningTotal + 1
      } else {
        return runningTotal + cardValue(ace)
      }
    }, nonAceValues)

    faceDownCards.forEach(card => card.turn())

    return total
  }

  function cardValue (card) {
    const cardRank = card.getDetails().rank
    if (Number(cardRank) <= 9) {
      return Number(cardRank)
    } else if (cardRank === 'A') {
      return 11
    } else {
      return 10
    }
  }

  function calculateWinner() {
    const playerTotal = total(player.hand)
    const dealerTotal = total(dealerHand)
    
    const playerHasWon = (playerTotal > dealerTotal && playerTotal <= BLACKJACK) || dealerTotal > BLACKJACK
    const playerHasDrawn = playerTotal === dealerTotal
    
    if (playerHasWon) {
      player.chips += (player.wagered * 2)
    } else if (playerHasDrawn) {
      player.chips += player.wagered
    }

    state = STATES.DONE
  }

  // Resets player's hand, dealer's hand, gives a new deck (no card counting here!)
  function clearBoard () {
    player.hand = []
    dealerHand = []
    deck = new Deck()
    state = STATES.READY
  }

  return {
    clearBoard,
    getActions,
    step,
    total,
    stepUntilChange,
    getDealerHand: () => dealerHand,
    getState: () => state,
    getPlayer: () => player
  }
}

module.exports = {
  Engine: Blackjack,
  STATES
} 
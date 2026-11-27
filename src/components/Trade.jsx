import { useEffect, useRef, useState } from 'react';
import { formatHatchChance, koiVariety, KOI_VARIETIES } from '../game/fish.js';

export default function Trade({ state, open, onClose }) {
  const dialogRef = useRef(null);
  const [playerName, setPlayerName] = useState('');
  const [offerType, setOfferType] = useState('food');
  const [offerAmount, setOfferAmount] = useState('1');
  const [offerFishId, setOfferFishId] = useState(String(state.fish[0]?.id || ''));
  const [requestType, setRequestType] = useState('food');
  const [requestAmount, setRequestAmount] = useState('1');
  const [requestVariety, setRequestVariety] = useState('any');
  const [offers, setOffers] = useState([]);
  const [message, setMessage] = useState(null);

  const offeredFish = state.fish.find((fish) => String(fish.id) === offerFishId);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    else if (!open && dialog?.open) dialog.close();
  }, [open]);

  const createOffer = (event) => {
    event.preventDefault();
    const offeredAmount = Number(offerAmount);
    const requestedAmount = Number(requestAmount);

    if (!playerName.trim()) {
      setMessage({ error: true, text: 'Enter the other player’s name.' });
      return;
    }
    if (offerType === 'food' && (!Number.isInteger(offeredAmount) || offeredAmount < 1 || offeredAmount > state.food)) {
      setMessage({ error: true, text: `Choose a food amount from 1 to ${state.food}.` });
      return;
    }
    if (offerType === 'koi' && !offeredFish) {
      setMessage({ error: true, text: 'Choose a koi to offer.' });
      return;
    }
    if (requestType === 'food' && (!Number.isInteger(requestedAmount) || requestedAmount < 1)) {
      setMessage({ error: true, text: 'Choose a valid amount of requested food.' });
      return;
    }

    const give = offerType === 'food'
      ? `${offeredAmount} food`
      : `${koiVariety(offeredFish.varietyId).type} koi, ${offeredFish.name}`;
    const receive = requestType === 'food'
      ? `${requestedAmount} food`
      : requestVariety === 'any'
        ? 'any koi'
        : `${koiVariety(requestVariety).type} koi`;

    setOffers((current) => [
      { id: `${Date.now()}-${current.length}`, player: playerName.trim(), give, receive },
      ...current,
    ]);
    setPlayerName('');
    setMessage({ error: false, text: 'Preview offer added. No items were moved.' });
  };

  return (
    <dialog
      ref={dialogRef}
      className="trade-dialog"
      aria-labelledby="trade-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current.close();
      }}
    >
      <div className="page-stack trade-page">
      <section className="tile tile-water trade-intro">
        <div className="trade-modal-head">
          <h2 id="trade-title">Trade with players</h2>
          <button className="btn small" type="button" onClick={onClose}>Close</button>
        </div>
        <p className="soft">Offer food or a koi and choose what you would like in return.</p>
        <p className="trade-preview-note">
          UI preview only. Offers are not shared with other players, and food or koi will not be transferred.
        </p>
      </section>

      <section className="tile tile-plain">
        <h2>Create an offer</h2>
        <p className="soft tiny trade-balance">
          Available for preview: {state.food} food and {state.fish.length} koi. Creating an offer does not reserve anything.
        </p>
        <form className="trade-form" onSubmit={createOffer}>
          <label className="field">
            <span>Player name</span>
            <input
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder="@player"
              maxLength={40}
              required
            />
          </label>

          <div className="trade-grid">
            <fieldset className="trade-side">
              <legend>You offer</legend>
              <label className="field">
                <span>Offer type</span>
                <select value={offerType} onChange={(event) => setOfferType(event.target.value)}>
                  <option value="food">Food</option>
                  <option value="koi">Koi</option>
                </select>
              </label>
              {offerType === 'food' ? (
                <label className="field">
                  <span>Food amount</span>
                  <input
                    type="number"
                    min="1"
                    max={state.food}
                    step="1"
                    value={offerAmount}
                    onChange={(event) => setOfferAmount(event.target.value)}
                    required
                  />
                </label>
              ) : (
                <label className="field">
                  <span>Koi</span>
                  <select
                    value={offerFishId}
                    onChange={(event) => setOfferFishId(event.target.value)}
                    required
                  >
                    {state.fish.length === 0 && <option value="">No koi available</option>}
                    {state.fish.map((fish) => (
                      <option key={fish.id} value={String(fish.id)}>
                        {fish.name} — {koiVariety(fish.varietyId).type}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </fieldset>

            <fieldset className="trade-side">
              <legend>You request</legend>
              <label className="field">
                <span>Request type</span>
                <select value={requestType} onChange={(event) => setRequestType(event.target.value)}>
                  <option value="food">Food</option>
                  <option value="koi">Koi</option>
                </select>
              </label>
              {requestType === 'food' ? (
                <label className="field">
                  <span>Food amount</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={requestAmount}
                    onChange={(event) => setRequestAmount(event.target.value)}
                    required
                  />
                </label>
              ) : (
                <label className="field">
                  <span>Koi variety</span>
                  <select value={requestVariety} onChange={(event) => setRequestVariety(event.target.value)}>
                    <option value="any">Any variety</option>
                    {KOI_VARIETIES.map((variety) => (
                      <option key={variety.id} value={variety.id}>
                        {variety.type} ({formatHatchChance(variety.hatchChance)})
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </fieldset>
          </div>

          <button
            className="btn primary"
            type="submit"
            disabled={(offerType === 'food' && state.food < 1) || (offerType === 'koi' && state.fish.length === 0)}
          >
            Add preview offer
          </button>
          {message && (
            <p className={`notice ${message.error ? 'bad' : 'good'}`} role="status">{message.text}</p>
          )}
        </form>
      </section>

      <section className="tile tile-plain">
        <h2>Your preview offers</h2>
        {offers.length === 0 ? (
          <p className="soft">No preview offers yet. Create one above to see how a trade listing will look.</p>
        ) : (
          <ul className="trade-offers">
            {offers.map((offer) => (
              <li key={offer.id} className="trade-offer">
                <div>
                  <b>To {offer.player}</b>
                  <p>You offer: {offer.give}</p>
                  <p>You request: {offer.receive}</p>
                </div>
                <button
                  className="btn small"
                  type="button"
                  onClick={() => setOffers((current) => current.filter((item) => item.id !== offer.id))}
                  aria-label={`Remove preview offer to ${offer.player}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </dialog>
  );
}

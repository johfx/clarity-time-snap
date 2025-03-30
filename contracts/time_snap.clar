;; TimeSnap NFT Contract
(define-non-fungible-token time-snap uint)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-invalid-token (err u101))
(define-constant err-expired (err u102))
(define-constant err-not-owner (err u103))

;; Data structures
(define-map token-metadata uint 
  {
    name: (string-ascii 256),
    owner: principal,
    created-at: uint,
    expires-at: uint
  }
)

;; Mint new NFT with expiration
(define-public (mint-nft (name (string-ascii 256)) (duration uint) (recipient principal))
  (let 
    (
      (token-id (+ u1 (var-get last-token-id)))
      (block-height (unwrap-panic (get-block-height)))
    )
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (try! (nft-mint? time-snap token-id recipient))
    (map-set token-metadata token-id
      {
        name: name,
        owner: recipient,
        created-at: block-height,
        expires-at: (+ block-height duration)
      }
    )
    (var-set last-token-id token-id)
    (ok token-id)
  )
)

;; Transfer NFT
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (let ((metadata (unwrap! (map-get? token-metadata token-id) err-invalid-token)))
    (asserts! (is-valid token-id) err-expired)
    (asserts! (is-eq (get owner metadata) sender) err-not-owner)
    (try! (nft-transfer? time-snap token-id sender recipient))
    (map-set token-metadata token-id
      (merge metadata { owner: recipient })
    )
    (ok true)
  )
)

;; Burn expired NFT
(define-public (burn (token-id uint))
  (let ((metadata (unwrap! (map-get? token-metadata token-id) err-invalid-token)))
    (asserts! (not (is-valid token-id)) err-invalid-token)
    (try! (nft-burn? time-snap token-id (get owner metadata)))
    (map-delete token-metadata token-id)
    (ok true)
  )
)

;; Read-only functions
(define-read-only (get-token-metadata (token-id uint))
  (ok (map-get? token-metadata token-id))
)

(define-read-only (is-valid (token-id uint))
  (let 
    (
      (metadata (unwrap! (map-get? token-metadata token-id) false))
      (current-height (unwrap! (get-block-height) false))
    )
    (< current-height (get expires-at metadata))
  )
)

(define-read-only (time-remaining (token-id uint))
  (let
    (
      (metadata (unwrap! (map-get? token-metadata token-id) (err err-invalid-token)))
      (current-height (unwrap! (get-block-height) (err err-invalid-token)))
    )
    (ok (- (get expires-at metadata) current-height))
  )
)

;; State variables
(define-data-var last-token-id uint u0)

import { UserCircleIcon } from "@heroicons/react/24/solid";
import {
  useContract,
  useNetwork,
  useNetworkMismatch,
  useMakeBid,
  useOffers,
  useMakeOffer,
  useBuyNow,
  MediaRenderer,
  useAddress,
  useListing,
  useAcceptDirectListingOffer,
} from "@thirdweb-dev/react";
import { ListingType, NATIVE_TOKENS } from "@thirdweb-dev/sdk";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import Countdown from "react-countdown";
import network from "../../utils/network";
import { ethers } from "ethers";
import toast, { Toaster } from "react-hot-toast";

type Props = {};

const ListingPage = (props: Props) => {
  const router = useRouter();
  const address = useAddress();
  const [processingBuy, setProcessingBuy] = useState(false);
  const [processingOffer, setProcessingOffer] = useState(false);
  const { listingId } = router.query as { listingId: string };
  const [bidAmount, setBidAmount] = useState("");
  const [, switchNetwork] = useNetwork();
  const networkMismatch = useNetworkMismatch();
  const [minimumNextBid, setMinimumNextBid] = useState<{
    displayValue: string;
    symbol: string;
  }>();

  const { contract } = useContract(
    process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT,
    "marketplace"
  );

  const {
    mutate: makeBid,
    isLoading: makeBidIsLoading,
    error: makeBidError,
  } = useMakeBid(contract);

  const { data: offers } = useOffers(contract, listingId);

  console.log("Offers are: ", offers);

  const {
    mutate: acceptOffer,
    isLoading: acceptOfferIsLoading,
    error: acceptOfferError,
  } = useAcceptDirectListingOffer(contract);

  const {
    mutate: makeOffer,
    isLoading: makeOfferIsLoading,
    error: makeOfferError,
  } = useMakeOffer(contract);

  const {
    mutate: buyNow,
    isLoading: buyNowIsLoading,
    error: buyNowError,
  } = useBuyNow(contract);

  const { data: listing, isLoading, error } = useListing(contract, listingId);

  useEffect(() => {
    if (!listing || !contract || !listingId) return;
    if (listing.type === ListingType.Auction) {
      fetchMinNextBid();
    }
  }, [listingId, listing, contract]);

  console.log("minimumNextBid", minimumNextBid);

  const fetchMinNextBid = async () => {
    if (!listingId || !contract) return;

    const { displayValue, symbol } = await contract.auction.getMinimumNextBid(
      listingId
    );

    setMinimumNextBid({
      displayValue: displayValue,
      symbol: symbol,
    });
  };

  const formatPlaceholder = () => {
    if (!listing) return;
    if (listing?.type === ListingType.Direct) {
      return "Enter Offer Amount";
    }
    if (listing?.type === ListingType.Auction) {
      return Number(minimumNextBid?.displayValue) === 0
        ? "Enter Bid Amount"
        : `${minimumNextBid?.displayValue} ${minimumNextBid?.symbol} or more`;
      //   TODO: Improve bid amount
    }
  };

  const buyNft = async () => {
    setProcessingBuy(true);
    if (networkMismatch) {
      switchNetwork && switchNetwork(network);
      setProcessingBuy(false);
      setProcessingOffer(false);
      return;
    }

    if (!listingId || !contract || !listing) {
      setProcessingBuy(false);
      setProcessingOffer(false);
      return;
    }

    await buyNow(
      {
        id: listingId,
        buyAmount: 1,
        type: listing.type,
      },
      {
        onSuccess(data, variables, context) {
          setProcessingBuy(false);
          setProcessingOffer(false);
          toast.success("NFT bought successfully");
          console.log("onSuccess", data);
          router.replace("/");
        },
        onError(error, variables, context) {
          setProcessingBuy(false);
          setProcessingOffer(false);
          toast.error("Error buying NFT");
          console.log("onError", error, variables, context);
        },
      }
    );
  };

  const createBidOrOffer = async () => {
    setProcessingOffer(true);
    try {
      if (networkMismatch) {
        switchNetwork && switchNetwork(network);
        setProcessingOffer(false);
        return;
      }

      // Direct listing
      if (listing?.type === ListingType.Direct) {
        if (
          listing.buyoutPrice.toString() ===
          ethers.utils.parseEther(bidAmount).toString()
        ) {
          buyNft();
          return;
        }

        console.log("Buyout price was not met, making an offer");
        await makeOffer(
          {
            quantity: 1,
            listingId,
            pricePerToken: bidAmount,
          },
          {
            onSuccess(data, variables, context) {
              setProcessingOffer(false);
              toast.success("Offer made successfully");
              console.log(
                "Success, the offer was made!",
                data,
                variables,
                context
              );
              setBidAmount("");
              // router.replace("/");
            },
            onError(error, variables, context) {
              setProcessingOffer(false);
              toast.error("Error making offer");
              console.log("Error", error, variables, context);
            },
          }
        );
      }

      // Auction listing
      if (listing?.type === ListingType.Auction) {
        console.log("Making a bid...");

        await makeBid(
          {
            listingId,
            bid: bidAmount,
          },
          {
            onSuccess(data, variables, context) {
              setProcessingOffer(false);
              toast.success("Bid made successfully");
              console.log(
                "Success, the bid was made!",
                data,
                variables,
                context
              );
              setBidAmount("");
              // router.replace("/");
            },
            onError(error, variables, context) {
              setProcessingOffer(false);
              toast.error("Error making bid");
              console.log("Error", error, variables, context);
            },
          }
        );
      }
    } catch (error) {
      setProcessingOffer(false);
      console.error(error);
    }
  };

  if (isLoading)
    return (
      <div>
        <Header />
        <div className="text-center animate-pulse text-blue-500">
          <p>Loading Item...</p>
        </div>
      </div>
    );

  if (!listing) {
    <div>Listing not found</div>;
  }

  return (
    <div>
      <Header />
      <Toaster />

      <main className="max-w-6xl mx-auto p-2 flex flex-col lg:flex-row space-y-10 space-x-5 pr-10">
        <div className="p-10 border mx-auto lg:mx-0 max-w-md lg:max-w-xl">
          <MediaRenderer src={listing.asset.image} />
        </div>

        <section className="flex-1 space-y-5 pb-20 lg:pb-0">
          <div>
            <h1 className="text-xl font-bold">{listing.asset.name}</h1>
            <p className="text-gray-600">{listing.asset.description}</p>
            <p className="flex items-center text-xs sm:text-base">
              <UserCircleIcon className="h-5" />

              <span className="font-bold pr-1">Seller: </span>
              {listing.sellerAddress}
            </p>
          </div>

          <div className="grid grid-cols-2 items-center py-2">
            <p className="font-bold">Listing Type:</p>
            <p>
              {listing.type === ListingType.Direct
                ? "Direct Listing"
                : "Auction Listing"}
            </p>

            <p className="font-bold">Buy It Now Price:</p>
            <p className="text-4xl font-bold">
              {listing.buyoutCurrencyValuePerToken.displayValue}{" "}
              {listing.buyoutCurrencyValuePerToken.symbol}
            </p>

            <button
              onClick={buyNft}
              className={`col-start-2 mt-2 bg-blue-600 font-bold text-white rounded-full w-44 py-4 px-10 ${
                processingBuy ? "disabled" : ""
              }`}
            >
              {processingBuy ? "Processing..." : "Buy Now"}
            </button>
          </div>

          {/* If DIRECT, show offers here... */}

          {listing?.type === ListingType.Direct && offers && (
            <div className="grid grid-cols-2 gap-y-2">
              <p className="font-bold">Offers: </p>
              <p className="font-bold">
                {offers.length > 0 ? offers.length : 0}
              </p>

              {offers.length > 0 &&
                offers?.map((offer) => (
                  <>
                    <p className="flex items-center ml-5 text-sm italic">
                      <UserCircleIcon className="h-3 mr-2" />
                      {offer.offeror.slice(0, 5) +
                        "..." +
                        offer.offeror.slice(-5)}
                    </p>

                    <div>
                      <p
                        key={
                          offer.listingId +
                          offer.offeror +
                          offer.totalOfferAmount.toString()
                        }
                        className="text-sm italic"
                      >
                        {ethers.utils.formatEther(offer.totalOfferAmount)}{" "}
                        {NATIVE_TOKENS[network].symbol}
                      </p>

                      {listing.sellerAddress === address && (
                        <button
                          onClick={() => {
                            setProcessingBuy(true);
                            acceptOffer(
                              {
                                listingId,
                                addressOfOfferor: offer.offeror,
                              },
                              {
                                onSuccess(data, variables, context) {
                                  setProcessingBuy(false);
                                  toast.success("Offer accepted successfully");
                                  console.log(
                                    "Success, the offer was accepted!",
                                    data,
                                    variables,
                                    context
                                  );
                                  router.replace("/");
                                },
                                onError(error, variables, context) {
                                  setProcessingBuy(false);
                                  toast.error("Error accepting offer");
                                  console.log(
                                    "Error",
                                    error,
                                    variables,
                                    context
                                  );
                                },
                              }
                            );
                          }}
                          className="p-2 w-32 bg-red-500/50 rounded-lg font-bold text-xs cursor-pointer"
                        ></button>
                      )}
                    </div>
                  </>
                ))}
            </div>
          )}

          <div className="grid grid-cols-2 space-y-2 items-center justify-end">
            <hr className="col-span-2" />

            <p className="col-span-2 font-bold">
              {listing.type === ListingType.Direct
                ? "Make an Offer"
                : "Place a Bid"}
            </p>

            {/* Remaining time on auction goes here... */}

            {listing?.type === ListingType.Auction && (
              <>
                <p>Current Minimum Bid:</p>
                <p>
                  {minimumNextBid?.displayValue} {minimumNextBid?.symbol}
                </p>

                <p>Time Remaining:</p>
                <Countdown
                  date={Number(listing.endTimeInEpochSeconds.toString()) * 1000}
                />
              </>
            )}

            <input
              className="border p-2 rounded-lg mr-5"
              type="text"
              placeholder={formatPlaceholder()}
              onChange={(e) => setBidAmount(e.target.value)}
            />
            <button
              onClick={createBidOrOffer}
              className={`bg-red-600 font-bold text-white rounded-full w-44 py-4 px-10 ${
                processingOffer ? "disabled" : ""
              }`}
            >
              {processingOffer
                ? "Processing..."
                : listing?.type === ListingType.Direct
                ? "Offer"
                : "Bid"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ListingPage;

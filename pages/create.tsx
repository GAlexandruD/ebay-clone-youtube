import React, { FormEvent, useState } from "react";
import Header from "../components/Header";
import {
  MediaRenderer,
  useAddress,
  useContract,
  useNetwork,
  useNetworkMismatch,
  useOwnedNFTs,
  useCreateAuctionListing,
  useCreateDirectListing,
} from "@thirdweb-dev/react";
import Router, { useRouter } from "next/router";
import {
  ChainId,
  NFT,
  NATIVE_TOKENS,
  NATIVE_TOKEN_ADDRESS,
} from "@thirdweb-dev/sdk";
import network from "../utils/network";
import toast, { Toaster } from "react-hot-toast";

type Props = {};

const Create = (props: Props) => {
  const router = useRouter();
  const address = useAddress();
  const [processing, setProcessing] = useState(false);
  const { contract } = useContract(
    process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT,
    "marketplace"
  );

  const { contract: collectionContract } = useContract(
    process.env.NEXT_PUBLIC_COLLECTION_CONTRACT,
    "nft-collection"
  );

  const ownedNfts = useOwnedNFTs(collectionContract, address);
  const networkMismatch = useNetworkMismatch();
  const [, switchNetwork] = useNetwork();

  const [selectedNft, setSelectedNft] = useState<NFT>();

  const {
    mutate: createDirectListing,
    isLoading,
    error,
  } = useCreateDirectListing(contract);
  const {
    mutate: createAuctionListing,
    isLoading: isLoadingAuction,
    error: errorAuction,
  } = useCreateAuctionListing(contract);

  // This function gets called when the form is submitted.
  // The user has provided:
  // - contract address,
  // - token id,
  // - type of listing (direct or auction),
  // - price (if direct listing),
  const handleCreateListing = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProcessing(true);

    if (networkMismatch) {
      switchNetwork && switchNetwork(network);
      setProcessing(false);
      return;
    }

    if (!selectedNft) {
      setProcessing(false);
      return;
    }

    const target = e.target as typeof e.target & {
      elements: { listingType: { value: string }; price: { value: string } };
    };

    const { listingType, price } = target.elements;

    if (listingType.value === "directListing") {
      toast("Creating listing...", {
        icon: "⌛",
      });

      createDirectListing(
        {
          assetContractAddress: process.env.NEXT_PUBLIC_COLLECTION_CONTRACT!,
          tokenId: selectedNft.metadata.id,
          currencyContractAddress: NATIVE_TOKEN_ADDRESS,
          listingDurationInSeconds: 60 * 60 * 24 * 7, // 1 week
          quantity: 1,
          buyoutPricePerToken: price.value,
          startTimestamp: new Date(),
        },
        {
          onSuccess(data, variables, context) {
            setProcessing(false);
            toast.success("Successfully Listed!");

            console.log("Direct listing created", data, variables, context);
            router.push("/");
          },
          onError(error, variables, context) {
            setProcessing(false);
            toast.error("Could not list. Try again later.");

            console.log("Direct listing error", error, variables, context);
          },
        }
      );
    }

    if (listingType.value === "auctionListing") {
      toast("Creating auction...", {
        icon: "⌛",
      });
      createAuctionListing(
        {
          assetContractAddress: process.env.NEXT_PUBLIC_COLLECTION_CONTRACT!,
          buyoutPricePerToken: price.value,
          tokenId: selectedNft.metadata.id,
          startTimestamp: new Date(),
          currencyContractAddress: NATIVE_TOKEN_ADDRESS,
          listingDurationInSeconds: 60 * 60 * 24 * 7, // 1 week
          quantity: 1,
          reservePricePerToken: 0,
        },
        {
          onSuccess(data, variables, context) {
            setProcessing(false);
            toast.success("Successfully Listed the Auction!");
            console.log("Auction listing created", data, variables, context);
            router.push("/");
          },
          onError(error, variables, context) {
            setProcessing(false);
            toast.error("Could not list. Try again later.");
            console.log("Auction listing error", error, variables, context);
          },
        }
      );
    }
  };

  return (
    <div>
      <Header />
      <Toaster />

      <main className="max-w-6xl mx-auto p-10 pt-2">
        <h1 className="text-4xl font-bold">List an Item</h1>
        <h2 className="text-xl font-semibold pt-5">
          Select an Item you would like to Sell
        </h2>

        <hr className="mb-5" />

        <p>Below you will find the NFTs you own in your wallet</p>

        <div className="flex overflow-x-scroll space-x-2 p-4">
          {ownedNfts?.data?.map((nft) => (
            <div
              key={nft.metadata.id}
              onClick={() => setSelectedNft(nft)}
              className={`flex flex-col spacey-2 card min-w-fit border-2 bg-gray-100 ${
                nft.metadata.id === selectedNft?.metadata.id
                  ? "border-black"
                  : "border-transparent"
              }`}
            >
              <MediaRenderer
                className="h-48 rounded-lg"
                src={nft.metadata.image}
              />
              <p className="text-lg truncate font-bold">{nft.metadata.name}</p>
              <p className="text-xs truncate">{nft.metadata.description}</p>
            </div>
          ))}
        </div>

        {selectedNft && (
          <form onSubmit={handleCreateListing}>
            <div className="flex flex-col p-10">
              <div className="grid grid-cols-2 gap-5">
                <label className="border-r font-light">
                  Direct Listing / Fixed Price
                </label>
                <input
                  type="radio"
                  name="listingType"
                  value="directListing"
                  className="ml-auto h-10 w-10"
                />

                <label className="border-r font-light">Auction</label>
                <input
                  type="radio"
                  name="listingType"
                  value="auctionListing"
                  className="ml-auto h-10 w-10"
                />

                <label className="border-r font-light">Price</label>
                <input
                  className="bg-gray-100 p-5"
                  type="text"
                  name="price"
                  placeholder="0.05"
                />
              </div>
              <button
                type="submit"
                className={`bg-blue-600 text-white rounded-lg p-4 mt-8 ${
                  processing ? "disabled" : ""
                }`}
              >
                {processing ? "Processing..." : "Create Listing"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

export default Create;

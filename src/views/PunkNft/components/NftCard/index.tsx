import React, { useState, useContext, useCallback, useEffect } from 'react'
import _ from 'lodash'
import styled from 'styled-components'
import {
  Card,
  CardBody,
  Heading,
  Tag,
  Button,
  ChevronUpIcon,
  ChevronDownIcon,
  Text,
  CardFooter,
  useModal,
} from '@pancakeswap-libs/uikit'
import BigNumber from 'bignumber.js'
import { useWallet } from '@binance-chain/bsc-use-wallet'
import useI18n from 'hooks/useI18n'
import { Nft } from 'config/constants/types'
import { AMOUNT_TO_CLAIM, NftFarm, NFT } from 'config/constants/punk'
import { useHistory } from 'react-router-dom'
import { usePancakeRabbits } from 'hooks/useContract'
import InfoRow from '../InfoRow'
import Image from '../Image'
import { NftProviderContext } from '../../contexts/NftProvider'
import { getNewNftContract } from '../../utils/contracts'
import ClaimNftModal from '../ClaimNftModal'
import BurnNftModal from '../BurnNftModal'
import TransferNftModal from '../TransferNftModal'

interface NftCardProps {
  nft: Nft
}

const Header = styled(InfoRow)`
  min-height: 44px;
`

const DetailsButton = styled(Button).attrs({ variant: 'text', fullWidth: true })`
  height: auto;
  padding: 16px 24px;

  &:hover:not(:disabled):not(:active) {
    background-color: transparent;
  }

  &:focus:not(:active) {
    box-shadow: none;
  }
`

const InfoBlock = styled.div`
  padding: 0 24px 24px;
`

const Value = styled(Text)`
  font-weight: 600;
`

const ViewNft = styled(Text)`
  @media (max-width: 1300px) {
    font-size: 11px;
  }
`

const NftCard: React.FC<NftCardProps> = ({ nft }) => {
  const [state, setState] = useState({
    isLoading: false,
    isOpen: false,
    nftCount: 0,
    nftBurnCount: 0,
  })
  const [minted, setMinted] = useState(0)
  const [maxMint, setMaxMint] = useState(0)
  const [price, setPrice] = useState(new BigNumber(0))
  const TranslateString = useI18n()
  const {
    isInitialized,
    hasClaimed,
    canBurnNft,
    totalSupplyDistributed,
    currentDistributedSupply,
    getTokenIds,
    reInitialize,
    allowMultipleClaims,
    rarity,
    priceMultiplier,
    maxMintPerNft,
    tokenPerBurn,
    amounts,
    myMints,
    isApproved,
  } = useContext(NftProviderContext)
  const { account } = useWallet()
  const history = useHistory()

  const [requestedApproval, setRequestedApproval] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [error, setError] = useState(null)
  // maxMintPerNft limit max amount that a nft can be minted
  // maxMintByNft array containing individual amount of mint per nft index
  // prices array containing individual prices of a mint per nft index
  // tokenPerBurn global price

  const { nftId, name, previewImage, originalImage, description, tokenAmount, tokenSupply } = nft

  const firstCharOfAccount = account != null && account.slice(0, 4)
  const lastCharOfAccount = account != null && account.slice(-4)

  const accountName = account != null && `${firstCharOfAccount}...${lastCharOfAccount}`

  const loggedIn = account !== null

  // console.log('?hasClaimed', hasClaimed)
  // console.log('?ownerById', ownerById)

  const nftIndex = hasClaimed && hasClaimed.indexOf(nftId)

  const MINTS = myMints[nftIndex] || 0

  // not sure about this, you need to check if this oser own this nft in the view nft page.
  // const youAreTheLastOwner = ownerById && ownerById[nftIndex] && ownerById[nftIndex].toString() === account.toString()

  const MINTED = amounts[nftIndex] ? parseInt(amounts[nftIndex].toString()) : 0

  const walletCanClaim = maxMintPerNft === 0 || MINTED === undefined || MINTED < maxMint

  // console.log('CONTRACT/GALLERY INFO:', totalSupplyDistributed, rarity, priceMultiplier, maxMintPerNft, tokenPerBurn)
  // console.log('LIMITS BY NFT:', tokenPerBurn, amounts, maxMintByNft, prices)
  // console.log(nftId, 'walletCanClaim', walletCanClaim, maxMintPerNft, MINTED, MAX_MINT)

  const tokenIds = getTokenIds(nftId)
  // const isSupplyAvailable = currentDistributedSupply < totalSupplyDistributed

  useEffect(() => {
    const getNftInfoState = async () => {
      const newFarmContract = getNewNftContract()
      const nftInfoState = await newFarmContract.methods.nftInfoState(nftId).call()
      const { minted: mintedValue, maxMint: maxMintValue, price: priceValue } = nftInfoState
      setMinted(parseInt(mintedValue))
      setMaxMint(parseInt(maxMintValue))
      setPrice(new BigNumber(priceValue).div(new BigNumber(10).pow(18)))
    }
    getNftInfoState()
  }, [nftId, isInitialized])

  const isSupplyAvailable = minted < maxMint
  // const walletOwnsNft = tokenIds && tokenIds.length > 0
  const walletOwnsNft = MINTS > 0

  const Icon = state.isOpen ? ChevronUpIcon : ChevronDownIcon

  const fetchDetails = useCallback(async () => {
    setState((prevState) => ({ ...prevState, isLoading: true }))
    try {
      const { methods } = getNewNftContract()
      const nftCount = await methods.nftCount(nftId).call()
      const nftBurnCount = await methods.nftBurnCount(nftId).call()

      setState((prevState) => ({
        ...prevState,
        isLoading: false,
        isDataFetched: true,
        nftCount: parseInt(nftCount, 10),
        nftBurnCount: parseInt(nftBurnCount, 10),
      }))
    } catch (err) {
      console.error(err)
    }
  }, [nftId])

  const handleClick = async () => {
    if (state.isOpen) {
      setState((prevState) => ({ ...prevState, isOpen: !prevState.isOpen }))
    } else {
      try {
        await fetchDetails()
      } catch (err) {
        console.error(err)
      } finally {
        setState((prevState) => ({ ...prevState, isOpen: !prevState.isOpen }))
      }
    }
  }

  const nftContract = usePancakeRabbits(NFT)

  const handleApprove = useCallback(async () => {
    try {
      setState((prevState) => ({ ...prevState, isLoading: true }))
      setRequestedApproval(true)
      await nftContract.methods
        .setApprovalForAll(NftFarm, 'true')
        .send({ from: account })
        .on('sending', () => {
          setIsLoading(true)
        })
        .on('receipt', () => {
          console.log('receipt')
        })
        .on('error', () => {
          setError('Unable to transfer NFT')
          setIsLoading(false)
        })
      setState((prevState) => ({
        ...prevState,
        isLoading: false,
        isDataFetched: true,
      }))

      fetchDetails()
      reInitialize()
      setRequestedApproval(false)
    } catch (e) {
      console.error(e)
    }
  }, [account, nftContract, reInitialize, fetchDetails])

  const handleSuccess = () => {
    fetchDetails()
    reInitialize()
  }

  const [onPresentClaimModal] = useModal(<ClaimNftModal nft={nft} price={price} onSuccess={handleSuccess} />)
  const [onPresentBurnModal] = useModal(<BurnNftModal nft={nft} tokenIds={tokenIds} onSuccess={handleSuccess} />)
  const [onPresentTransferModal] = useModal(
    <TransferNftModal nft={nft} tokenIds={tokenIds} onSuccess={handleSuccess} />,
  )

  return (
    <Card isActive={walletOwnsNft}>
      <Image src={`/images/nfts/${previewImage}`} alt={name} originalLink={walletOwnsNft ? originalImage : null} />
      <CardBody>
        <Header>
          <Heading>{name}</Heading>
          {isInitialized && walletCanClaim && (
            <Tag outline variant="success">
              {TranslateString(526, 'Available')}
            </Tag>
          )}
          {isInitialized && !walletCanClaim && (
            <Tag outline variant="failure">
              Sold Out
            </Tag>
          )}
          {isInitialized && loggedIn && walletOwnsNft && (
            <Tag outline variant="secondary">
              {TranslateString(999, 'In Wallet')}
            </Tag>
          )}
        </Header>
        {isInitialized && loggedIn && walletOwnsNft && !isApproved && (
          <Button
            fullWidth
            variant="primary"
            mt="24px"
            onClick={() => {
              handleApprove()
            }}
          >
            Approve Transfer
          </Button>
        )}
        {isInitialized && loggedIn && walletOwnsNft && isApproved && (
          <Button fullWidth variant="secondary" mt="24px" onClick={onPresentTransferModal}>
            {TranslateString(999, 'Transfer')}
          </Button>
        )}
        {isInitialized && loggedIn && walletCanClaim && isSupplyAvailable && (
          <Button fullWidth onClick={onPresentClaimModal} mt="24px">
            {TranslateString(999, 'Claim this NFT')} for {_.round(parseFloat(price.toString()))} ALIFE
          </Button>
        )}
        {isInitialized && (
          <Button fullWidth onClick={() => history.push(`shibari-detail/${nftId}`)} mt="24px">
            <ViewNft>
              View NFT ({MINTED}/{maxMint} MINTED)
            </ViewNft>
          </Button>
        )}
        {/* {isInitialized && canBurnNft && walletOwnsNft && (
          <Button variant="danger" fullWidth onClick={onPresentBurnModal} mt="24px">
            {TranslateString(999, 'Trade in for ALIFE')}
          </Button>
        )} */}
      </CardBody>
      <CardFooter p="0">
        <DetailsButton endIcon={<Icon width="24px" color="primary" />} onClick={handleClick}>
          {state.isLoading ? TranslateString(999, 'Loading...') : TranslateString(999, 'Details')}
        </DetailsButton>
        {state.isOpen && (
          <InfoBlock>
            <Text as="p" color="textSubtle" mb="16px" style={{ textAlign: 'center' }}>
              {description}
            </Text>
            <InfoRow>
              <Text>{TranslateString(999, 'Number minted')}:</Text>
              <Value>
                {MINTED}/{maxMint}
              </Value>
            </InfoRow>
            <InfoRow>
              <Text>Owned By Me:</Text>
              <Value>{MINTS}</Value>
            </InfoRow>
          </InfoBlock>
        )}
      </CardFooter>
    </Card>
  )
}

export default NftCard

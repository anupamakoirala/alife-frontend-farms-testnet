import React, { useEffect, useState } from 'react'
import { ModalProvider } from '@pancakeswap-libs/uikit'
import Web3 from 'web3'
// import bsc, { UseWalletProvider } from '@binance-chain/bsc-use-wallet'
import * as bsc from '@binance-chain/bsc-use-wallet'
import { Provider } from 'react-redux'
import getRpcUrl from 'utils/getRpcUrl'
import { LanguageContextProvider } from 'contexts/Localisation/languageContext'
import { ThemeContextProvider } from 'contexts/ThemeContext'
import { BlockContextProvider } from 'contexts/BlockContext'
import { RefreshContextProvider } from 'contexts/RefreshContext'
import store from 'state'

declare const window: any

const Providers: React.FC = ({ children }) => {
  const { ethereum } = window
  const defaultChain = parseInt(process.env.REACT_APP_CHAIN_ID)
  const rpcUrl = getRpcUrl()
  const [chainId, setChainId] = useState(defaultChain)

  useEffect(() => {
    function detectChain() {
      ethereum.on('chainChanged', (chain) => {
        if (!chain) return
        const newChain = Web3.utils.hexToNumber(chain)
        setChainId(newChain)
      })
    }
    detectChain()
  }, [ethereum])
  return (
    <Provider store={store}>
      <ThemeContextProvider>
        <LanguageContextProvider>
          <bsc.UseWalletProvider
            chainId={chainId}
            connectors={{
              walletconnect: { rpcUrl },
              bsc,
            }}
          >
            <BlockContextProvider>
              <RefreshContextProvider>
                <ModalProvider>{children}</ModalProvider>
              </RefreshContextProvider>
            </BlockContextProvider>
          </bsc.UseWalletProvider>
        </LanguageContextProvider>
      </ThemeContextProvider>
    </Provider>
  )
}

export default Providers

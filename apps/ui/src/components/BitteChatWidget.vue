<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { getUserFacingErrorMessage, isUserAbortError } from '@/helpers/utils';

const chatContainer = ref<HTMLDivElement>();
const { auth } = useWeb3();
const actions = useActions();
const uiStore = useUiStore();

// Track React components
let React: any = null;
let ReactDOM: any = null;
let BitteWidgetChat: any = null;

// State to track wallet data
let currentHash: string | undefined;
let currentSignature: string | undefined;

onMounted(async () => {
  console.log('🔍 Component mounted');
  try {
    console.log('🔍 Loading React and Bitte AI Chat...');
    // Dynamically import React and Bitte AI Chat
    const [reactModule, reactDOMModule, chatModule] = await Promise.all([
      import('react'),
      import('react-dom/client'),
      import('@bitte-ai/chat')
    ]);

    React = reactModule.default;
    ReactDOM = reactDOMModule;
    BitteWidgetChat = chatModule.BitteWidgetChat;

    console.log('🔍 Modules loaded successfully');
    console.log('🔍 chatContainer.value:', !!chatContainer.value);

    if (chatContainer.value) {
      console.log('🔍 Calling renderBitteWidget...');
      renderBitteWidget();
    } else {
      console.log('🔴 chatContainer.value is null');
    }
  } catch (error) {
    console.error('Failed to load Bitte AI Chat:', error);
  }
});

function renderBitteWidget() {
  console.log('🔍 renderBitteWidget called');
  console.log('🔍 React components loaded:', {
    React: !!React,
    ReactDOM: !!ReactDOM,
    BitteWidgetChat: !!BitteWidgetChat,
    chatContainer: !!chatContainer.value
  });

  // Debug: Check auth state at function start
  console.log('🔍 Auth state at function start:', {
    authExists: !!auth.value,
    account: auth.value?.account,
    provider: !!auth.value?.provider,
    chainId: auth.value?.provider?.network?.chainId
  });

  // Log current wallet state (before early return check)
  console.log('🔍 Wallet state before render:', {
    currentHash,
    currentSignature,
    address: auth.value?.account,
    chainId: auth.value?.provider?.network?.chainId
  });

  if (!React || !ReactDOM || !BitteWidgetChat || !chatContainer.value) {
    console.log('🔴 Early exit - missing components:', {
      React: !!React,
      ReactDOM: !!ReactDOM,
      BitteWidgetChat: !!BitteWidgetChat,
      chatContainer: !!chatContainer.value
    });
    return;
  }

  // Create wagmi-like adapter using the same patterns as useActions
  const walletConfig = auth.value
    ? {
        evm: {
          address: auth.value.account,
          chainId: auth.value.provider?.network?.chainId,
          hash: currentHash,
          signature: currentSignature,
          sendTransaction: async (transaction: any) => {
            if (!auth.value?.provider) {
              throw new Error('No provider available');
            }

            try {
              const signer = auth.value.provider.getSigner();
              console.log('🔍 Sending transaction:', transaction);
              
              const tx = await signer.sendTransaction(transaction);
              console.log('🔍 Transaction sent:', tx);
              
              const receipt = await tx.wait();
              console.log('🔍 Transaction receipt:', receipt);

              currentHash = receipt.transactionHash || tx.hash;
              console.log('🟢 Transaction success:', { hash: currentHash });
              
              // Add success notification like useActions does
              if (currentHash) {
                uiStore.addNotification('success', 'Transaction completed successfully');
              }
              
              return { hash: currentHash };
            } catch (error) {
              console.error('🔴 Transaction failed:', error);
              
              // Use the same error handling pattern as useActions
              if (!isUserAbortError(error)) {
                uiStore.addNotification('error', getUserFacingErrorMessage(error));
              }
              
              throw error;
            }
          },
          signMessage: async (message: string) => {
            if (!auth.value?.provider) {
              throw new Error('No provider available');
            }

            try {
              const signer = auth.value.provider.getSigner();
              console.log('🔍 Signing message:', message);
              
              const signature = await signer.signMessage(message);
              
              currentSignature = signature;
              console.log('🟢 Message signature:', { signature: currentSignature });
              
              return signature;
            } catch (error) {
              console.error('🔴 Message signing failed:', error);
              
              if (!isUserAbortError(error)) {
                uiStore.addNotification('error', getUserFacingErrorMessage(error));
              }
              
              throw error;
            }
          },
          signTypedData: async (typedData: any) => {
            if (!auth.value?.provider) {
              throw new Error('No provider available');
            }

            try {
              const signer = auth.value.provider.getSigner();
              const parsedTypedData =
                typeof typedData === 'string' ? JSON.parse(typedData) : typedData;

              console.log('🔍 Signing typed data:', parsedTypedData);

              const cleanTypes = { ...parsedTypedData.types };
              delete cleanTypes.EIP712Domain;

              const signature = await signer._signTypedData(
                parsedTypedData.domain,
                cleanTypes,
                parsedTypedData.message
              );

              currentSignature = signature;
              console.log('🟢 Typed data signature:', { signature: currentSignature });
              
              return signature;
            } catch (error) {
              console.error('🔴 Typed data signing failed:', error);
              
              if (!isUserAbortError(error)) {
                uiStore.addNotification('error', getUserFacingErrorMessage(error));
              }
              
              throw error;
            }
          },
          switchChain: async (chainId: number | any) => {
            if (!auth.value?.provider?.provider?.request) {
              throw new Error('No provider available');
            }

            try {
              const actualChainId =
                typeof chainId === 'object' && chainId?.id
                  ? chainId.id
                  : typeof chainId === 'number'
                    ? chainId
                    : parseInt(chainId);

              const encodedChainId = `0x${actualChainId.toString(16)}`;
              console.log('🔍 Switching to chain:', { chainId: actualChainId, encoded: encodedChainId });
              
              await auth.value.provider.provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: encodedChainId }]
              });

              console.log('🟢 Chain switch success');
              return true;
            } catch (error) {
              console.error('🔴 Chain switch failed:', error);
              
              if (!isUserAbortError(error)) {
                uiStore.addNotification('error', getUserFacingErrorMessage(error));
              }
              
              throw error;
            }
          }
        }
      }
    : undefined;

  // Log final wallet config being passed to Bitte (moved to ensure it executes)
  console.log('🔍 Final wallet config passed to Bitte:', {
    walletConfig,
    evmConfig: walletConfig?.evm,
    hash: walletConfig?.evm?.hash,
    signature: walletConfig?.evm?.signature
  });

  // Create React element with proper props structure
  const chatElement = React.createElement(BitteWidgetChat, {
    agentId: 'snapshot-agent-theta.vercel.app',
    apiUrl: '/api/chat',
    format: 'markdown',
    wallet: walletConfig,
    options: { agentName: 'Snapshot DAO Agent' },
    widget: {
      triggerButtonStyles: {
        logoColor: '#FFAC32'
      },
      widgetWelcomePrompts: {
        questions: [
          'Do I have any open proposals?',
          'Show the latest proposals for cow.eth',
          'Search for uniswap spaces'
        ],
        actions: [
          'Vote yes on x proposal',
          'Do I have voting power on X proposal',
          'what can I do here?'
        ]
      }
    }
  });

  // Render using React 18's createRoot API
  const root = ReactDOM.createRoot(chatContainer.value);
  root.render(chatElement);

  // Store root for cleanup
  (chatContainer.value as any)._bitteRoot = root;
}

// Watch for auth changes and re-render widget
watch(
  () => auth.value,
  () => {
    if (chatContainer.value && React && ReactDOM && BitteWidgetChat) {
      renderBitteWidget();
    }
  },
  { deep: true }
);

onUnmounted(() => {
  if (chatContainer.value) {
    // Clean up React component
    const root = (chatContainer.value as any)._bitteRoot;
    if (root && root.unmount) {
      root.unmount();
    }
  }
});
</script>

<template>
  <div ref="chatContainer" class="bitte-chat-container" />
</template>

<style scoped>
.bitte-chat-container {
  width: 100%;
  height: 100%;
}

/* Ensure the Bitte chat styles work well with the existing UI */
.bitte-chat-container :deep(.bitte-widget) {
  z-index: 9999;
}
</style>

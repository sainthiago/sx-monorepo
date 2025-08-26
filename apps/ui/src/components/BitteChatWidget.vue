<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';

const chatContainer = ref<HTMLDivElement>();
const { auth } = useWeb3();

// Track React components
let React: any = null;
let ReactDOM: any = null;
let BitteWidgetChat: any = null;

onMounted(async () => {
  try {
    // Dynamically import React and Bitte AI Chat
    const [reactModule, reactDOMModule, chatModule] = await Promise.all([
      import('react'),
      import('react-dom/client'),
      import('@bitte-ai/chat')
    ]);

    React = reactModule.default;
    ReactDOM = reactDOMModule;
    BitteWidgetChat = chatModule.BitteWidgetChat;

    if (chatContainer.value) {
      renderBitteWidget();
    }
  } catch (error) {
    console.error('Failed to load Bitte AI Chat:', error);
  }
});

function renderBitteWidget() {
  if (!React || !ReactDOM || !BitteWidgetChat || !chatContainer.value) return;

  // Prepare wallet configuration
  const walletConfig = auth.value
    ? {
        evm: {
          address: auth.value.account,
          sendTransaction: async (transaction: any) => {
            try {
              const provider = auth.value?.provider;
              if (!provider) throw new Error('No provider available');

              // Get signer the same way the project does it
              const signer = provider.getSigner();

              // Send transaction using the signer
              const tx = await signer.sendTransaction(transaction);

              // Wait for the transaction to be mined and return the hash
              const receipt = await tx.wait();
              return receipt.transactionHash || tx.hash;
            } catch (error) {
              console.error('Transaction failed:', error);
              throw error;
            }
          },
          signTypedData: async (typedData: any) => {
            try {
              const provider = auth.value?.provider;
              if (!provider) throw new Error('No provider available');

              // Get signer the same way the project does it
              const signer = provider.getSigner();

              // Parse typed data if it's a string
              const parsedTypedData =
                typeof typedData === 'string'
                  ? JSON.parse(typedData)
                  : typedData;

              // Remove EIP712Domain from types as ethers.js handles it separately
              const cleanTypes = { ...parsedTypedData.types };
              delete cleanTypes.EIP712Domain;

              // Sign typed data using ethers.js format
              const signature = await signer._signTypedData(
                parsedTypedData.domain,
                cleanTypes,
                parsedTypedData.message
              );

              return signature;
            } catch (error) {
              console.error('Typed data signing failed:', error);
              throw error;
            }
          },
          switchChain: async (chainId: number | any) => {
            try {
              const provider = auth.value?.provider;
              if (!provider?.provider?.request) {
                throw new Error('No provider available');
              }

              // Extract the actual chain ID number if it's an object
              const actualChainId =
                typeof chainId === 'object' && chainId?.id
                  ? chainId.id
                  : typeof chainId === 'number'
                    ? chainId
                    : parseInt(chainId);

              // Use the same pattern as the project for chain switching
              const encodedChainId = `0x${actualChainId.toString(16)}`;
              await provider.provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: encodedChainId }]
              });
            } catch (error) {
              console.error('Chain switch failed:', error);
              throw error;
            }
          }
        }
      }
    : undefined;

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

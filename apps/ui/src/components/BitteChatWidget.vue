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
              const signer = provider.getSigner();
              const tx = await signer.sendTransaction(transaction);
              return tx.hash;
            } catch (error) {
              console.error('Transaction failed:', error);
              throw error;
            }
          },
          switchChain: async (chainId: number) => {
            try {
              const ethereum = (window as any).ethereum;
              if (ethereum && ethereum.request) {
                await ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: `0x${chainId.toString(16)}` }]
                });
              }
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
    apiUrl: '/api/bitte/chat',
    format: 'markdown',
    wallet: walletConfig,
    options: { agentName: 'Snapshot DAO Agent' },
    widget: {
      triggerButtonStyles: {
        logoColor: '#FFAC32'
      },
      widgetWelcomePrompts: {
        questions: [
          'What is the latest activity?',
          'Show me trending proposals',
          'Help me understand voting power'
        ],
        actions: ['Create Proposal', 'Vote', 'Delegate']
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

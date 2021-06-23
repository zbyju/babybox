import { ref, onMounted, watch } from "vue";

export default function useUserRepositories(time) {
  const showColon = ref(true);
  const toggleColon = () => {
    showColon.value = !showColon.value;
  };
  watch(time, toggleColon);

  return {
    showColon,
  };
}

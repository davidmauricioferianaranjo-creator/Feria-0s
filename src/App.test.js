import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Feria OS login screen', async () => {
  render(<App />);
  expect(await screen.findByText(/Bienvenido/i)).toBeInTheDocument();
  expect(screen.getByText(/Cuentas demo/i)).toBeInTheDocument();
});

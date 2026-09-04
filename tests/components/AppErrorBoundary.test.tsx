import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AppErrorBoundary } from '../../src/ui/AppErrorBoundary';

function Boom(): never {
  throw new Error('kaboom in render');
}

describe('AppErrorBoundary', () => {
  const originalError = console.error;
  beforeAll(() => { console.error = jest.fn(); }); // silence React's boundary logging
  afterAll(() => { console.error = originalError; });

  it('renders children when nothing throws', () => {
    render(
      <AppErrorBoundary>
        <Text>safe content</Text>
      </AppErrorBoundary>,
    );
    expect(screen.getByText('safe content')).toBeTruthy();
  });

  it('shows the recovery card (not a blank screen) when a child throws', () => {
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(screen.getByText('Save report to a file')).toBeTruthy();
  });

  it('"Try again" re-attempts the subtree', () => {
    let shouldThrow = true;
    function Flaky() {
      if (shouldThrow) throw new Error('first render fails');
      return <Text>recovered</Text>;
    }
    render(
      <AppErrorBoundary>
        <Flaky />
      </AppErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    shouldThrow = false;
    fireEvent.press(screen.getByText('Try again'));
    expect(screen.getByText('recovered')).toBeTruthy();
  });
});
